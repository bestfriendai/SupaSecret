import Foundation
import Vision
import CoreImage
import AVFoundation
import UIKit
import Metal

@objc(FaceBlurModule)
class FaceBlurModule: NSObject {
  // Use Metal for hardware acceleration
  private lazy var context: CIContext = {
    if let device = MTLCreateSystemDefaultDevice() {
      return CIContext(mtlDevice: device, options: [
        .workingColorSpace: NSNull(),
        .cacheIntermediates: false
      ])
    }
    return CIContext(options: [.useSoftwareRenderer: false])
  }()

  // Cache for face tracking across frames
  private var lastDetectedFaces: [VNFaceObservation] = []
  private var framesSinceLastDetection = 0

  @objc
  func blurFacesInVideo(_ inputPath: String, blurIntensity: NSInteger, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let outputPath = try self.processVideo(inputPath: inputPath, blurIntensity: Int(blurIntensity))
        resolve([
          "success": true,
          "outputPath": outputPath
        ])
      } catch {
        reject("BLUR_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc
  func isAvailable(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    resolve(true)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  private func processVideo(inputPath: String, blurIntensity: Int) throws -> String {
    // Convert input path to URL
    let inputURL: URL
    if inputPath.hasPrefix("file://") {
      inputURL = URL(string: inputPath)!
    } else {
      inputURL = URL(fileURLWithPath: inputPath)
    }

    // Create output URL
    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("blurred_\(UUID().uuidString).mov")

    // Load video asset
    let asset = AVAsset(url: inputURL)

    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      throw NSError(domain: "FaceBlur", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
    }

    // Get video properties
    let videoSize = videoTrack.naturalSize
    let transform = videoTrack.preferredTransform

    // Determine video orientation from transform
    let orientation = videoOrientationFromTransform(transform)
    print("📹 Video orientation: \(orientation), size: \(videoSize), transform: \(transform)")

    // Setup reader and writer
    let reader = try AVAssetReader(asset: asset)
    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mov)

    // Configure video output
    let outputSettings: [String: Any] = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
    ]
    let readerOutput = AVAssetReaderTrackOutput(track: videoTrack, outputSettings: outputSettings)
    reader.add(readerOutput)

    // Configure video input
    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: videoSize.width,
      AVVideoHeightKey: videoSize.height,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 6000000
      ]
    ])
    writerInput.transform = transform
    writerInput.expectsMediaDataInRealTime = false

    let pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: writerInput,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: videoSize.width,
        kCVPixelBufferHeightKey as String: videoSize.height
      ]
    )

    writer.add(writerInput)

    // ✅ FIX: Add audio track to preserve audio in output video
    var audioWriterInput: AVAssetWriterInput?
    var audioReaderOutput: AVAssetReaderTrackOutput?

    if let audioTrack = asset.tracks(withMediaType: .audio).first {
      print("🔊 Found audio track, adding to output video")

      // Configure audio output from reader
      audioReaderOutput = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: nil)
      reader.add(audioReaderOutput!)

      // Configure audio input for writer
      audioWriterInput = AVAssetWriterInput(mediaType: .audio, outputSettings: nil)
      audioWriterInput?.expectsMediaDataInRealTime = false
      writer.add(audioWriterInput!)
    } else {
      print("⚠️ No audio track found in video")
    }

    // Start reading and writing
    reader.startReading()
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    // Process frames
    let processingQueue = DispatchQueue(label: "video.processing.queue")
    let semaphore = DispatchSemaphore(value: 0)

    var frameCount = 0
    var facesDetectedCount = 0

    // Reset face tracking cache
    self.lastDetectedFaces = []
    self.framesSinceLastDetection = 0

    // Process video frames
    writerInput.requestMediaDataWhenReady(on: processingQueue) {
      while writerInput.isReadyForMoreMediaData {
        guard let sampleBuffer = readerOutput.copyNextSampleBuffer() else {
          writerInput.markAsFinished()
          print("🎬 Video processing complete: \(frameCount) frames, \(facesDetectedCount) frames with faces")
          semaphore.signal()
          return
        }

        frameCount += 1

        // Process frame with face blur (pass orientation)
        if let processedBuffer = self.processFrame(sampleBuffer, blurIntensity: blurIntensity, orientation: orientation) {
          pixelBufferAdaptor.append(processedBuffer, withPresentationTime: CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
        }

        // Log progress every 30 frames
        if frameCount % 30 == 0 {
          print("📊 Processed \(frameCount) frames...")
        }
      }
    }

    // ✅ FIX: Process audio track in parallel
    if let audioInput = audioWriterInput, let audioOutput = audioReaderOutput {
      audioInput.requestMediaDataWhenReady(on: processingQueue) {
        while audioInput.isReadyForMoreMediaData {
          guard let audioBuffer = audioOutput.copyNextSampleBuffer() else {
            audioInput.markAsFinished()
            print("🔊 Audio processing complete")
            return
          }
          audioInput.append(audioBuffer)
        }
      }
    }

    semaphore.wait()

    // Finish writing
    writer.finishWriting { }

    // Wait for completion
    while writer.status == .writing {
      Thread.sleep(forTimeInterval: 0.1)
    }

    if writer.status == .failed {
      throw writer.error ?? NSError(domain: "FaceBlur", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to write video"])
    }

    return outputURL.path
  }

  private var lastFaceDetectionLog: Date = Date()

  private func processFrame(_ sampleBuffer: CMSampleBuffer, blurIntensity: Int, orientation: CGImagePropertyOrientation) -> CVPixelBuffer? {
    guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return nil
    }

    let ciImage = CIImage(cvPixelBuffer: imageBuffer)

    // Detect faces every 5 frames for performance, use cached results otherwise
    framesSinceLastDetection += 1
    if framesSinceLastDetection >= 5 || lastDetectedFaces.isEmpty {
      lastDetectedFaces = detectFaces(in: ciImage, orientation: orientation)
      framesSinceLastDetection = 0
    }

    // If no faces detected, return original
    if lastDetectedFaces.isEmpty {
      // Log occasionally to show we're checking
      let now = Date()
      if now.timeIntervalSince(lastFaceDetectionLog) > 1.0 {
        print("🔍 No faces detected in current frames")
        lastFaceDetectionLog = now
      }
      return imageBuffer
    }

    // Apply pixelation to face regions (better privacy than blur)
    var outputImage = ciImage

    for (index, face) in lastDetectedFaces.enumerated() {
      // Convert normalized coordinates to image coordinates
      let imageSize = ciImage.extent.size
      let faceRect = VNImageRectForNormalizedRect(
        face.boundingBox,
        Int(imageSize.width),
        Int(imageSize.height)
      )

      // Expand face region significantly for better coverage (60% expansion)
      let expandedRect = faceRect.insetBy(dx: -faceRect.width * 0.6, dy: -faceRect.height * 0.6)

      // Clamp to image bounds
      let clampedRect = expandedRect.intersection(ciImage.extent)

      if index == 0 && framesSinceLastDetection == 0 {
        print("🎭 Blurring face \(index + 1): rect=\(clampedRect), confidence=\(face.confidence)")
      }

      // Create pixelated version of the face region
      let faceRegion = outputImage.cropped(to: clampedRect)

      // Use CIPixellate for better privacy and performance
      guard let pixellateFilter = CIFilter(name: "CIPixellate") else {
        print("❌ Failed to create pixellate filter")
        continue
      }

      // ✅ FIX: Much stronger pixelation for better face blur
      // Scale determines pixelation size (higher = more pixelated)
      // Use full blurIntensity value with higher minimum for strong effect
      let pixelScale = max(Double(blurIntensity), 30.0) // Minimum 30 for strong visible effect
      pixellateFilter.setValue(faceRegion, forKey: kCIInputImageKey)
      pixellateFilter.setValue(pixelScale, forKey: kCIInputScaleKey)
      pixellateFilter.setValue(CIVector(x: clampedRect.midX, y: clampedRect.midY), forKey: kCIInputCenterKey)

      guard var pixellated = pixellateFilter.outputImage else {
        print("❌ Failed to get pixellated output")
        continue
      }

      // Crop to original extent
      pixellated = pixellated.cropped(to: clampedRect)

      // Composite pixellated region over the output image
      outputImage = pixellated.composited(over: outputImage)

      if index == 0 && framesSinceLastDetection == 0 {
        print("✅ Face \(index + 1) pixellated successfully")
      }
    }

    // Render to pixel buffer
    var outputBuffer: CVPixelBuffer?
    CVPixelBufferCreate(
      kCFAllocatorDefault,
      Int(ciImage.extent.width),
      Int(ciImage.extent.height),
      kCVPixelFormatType_32BGRA,
      nil,
      &outputBuffer
    )

    if let buffer = outputBuffer {
      context.render(outputImage, to: buffer)
    }

    return outputBuffer
  }

  private func detectFaces(in image: CIImage, orientation: CGImagePropertyOrientation) -> [VNFaceObservation] {
    // Use face detection with proper orientation
    let request = VNDetectFaceRectanglesRequest()

    // Set options for better detection with correct orientation
    let handler = VNImageRequestHandler(ciImage: image, orientation: orientation, options: [:])

    do {
      try handler.perform([request])
      let results = request.results as? [VNFaceObservation] ?? []

      // Log detection results for debugging
      if !results.isEmpty {
        print("✅ Detected \(results.count) face(s) in frame (orientation: \(orientation.rawValue))")
        for (index, face) in results.enumerated() {
          print("  Face \(index + 1): bounds=\(face.boundingBox), confidence=\(face.confidence)")
        }
      }

      return results
    } catch {
      print("❌ Face detection error: \(error)")
      return []
    }
  }

  // Helper to determine video orientation from transform matrix
  private func videoOrientationFromTransform(_ transform: CGAffineTransform) -> CGImagePropertyOrientation {
    // Check transform to determine orientation
    if transform.a == 0 && transform.b == 1.0 && transform.c == -1.0 && transform.d == 0 {
      // 90 degrees rotation (landscape right)
      return .right
    } else if transform.a == 0 && transform.b == -1.0 && transform.c == 1.0 && transform.d == 0 {
      // -90 degrees rotation (landscape left)
      return .left
    } else if transform.a == 1.0 && transform.b == 0 && transform.c == 0 && transform.d == 1.0 {
      // No rotation (portrait)
      return .up
    } else if transform.a == -1.0 && transform.b == 0 && transform.c == 0 && transform.d == -1.0 {
      // 180 degrees rotation
      return .down
    } else {
      // Default to up for front camera (often mirrored)
      return .upMirrored
    }
  }
}
