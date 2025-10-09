import ExpoModulesCore
import Vision
import CoreImage
import AVFoundation
import UIKit

public class FaceBlurModule: Module {
  private let context = CIContext(options: [.useSoftwareRenderer: false])

  public func definition() -> ModuleDefinition {
    Name("FaceBlurModule")

    // Async function to blur faces in a video
    AsyncFunction("blurFacesInVideo") { (inputPath: String, blurIntensity: Int, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let outputPath = try self.processVideo(inputPath: inputPath, blurIntensity: blurIntensity)
          promise.resolve([
            "success": true,
            "outputPath": outputPath
          ])
        } catch {
          promise.reject("BLUR_ERROR", error.localizedDescription)
        }
      }
    }

    // Function to check if face blur is available
    Function("isAvailable") { () -> Bool in
      return true // Always available on iOS
    }
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
    let duration = asset.duration
    let fps = videoTrack.nominalFrameRate
    let videoSize = videoTrack.naturalSize
    let transform = videoTrack.preferredTransform

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

    // Start reading and writing
    reader.startReading()
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    // Process frames
    let processingQueue = DispatchQueue(label: "video.processing.queue")
    let semaphore = DispatchSemaphore(value: 0)

    writerInput.requestMediaDataWhenReady(on: processingQueue) {
      while writerInput.isReadyForMoreMediaData {
        guard let sampleBuffer = readerOutput.copyNextSampleBuffer() else {
          writerInput.markAsFinished()
          semaphore.signal()
          return
        }

        // Process frame with face blur
        if let processedBuffer = self.processFrame(sampleBuffer, blurIntensity: blurIntensity) {
          pixelBufferAdaptor.append(processedBuffer, withPresentationTime: CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
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

  private func processFrame(_ sampleBuffer: CMSampleBuffer, blurIntensity: Int) -> CVPixelBuffer? {
    guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return nil
    }

    let ciImage = CIImage(cvPixelBuffer: imageBuffer)

    // Detect faces
    let faces = detectFaces(in: ciImage)

    // If no faces detected, return original
    if faces.isEmpty {
      return imageBuffer
    }

    // Apply blur to face regions
    var outputImage = ciImage

    for face in faces {
      // Convert normalized coordinates to image coordinates
      let imageSize = ciImage.extent.size
      let faceRect = VNImageRectForNormalizedRect(
        face.boundingBox,
        Int(imageSize.width),
        Int(imageSize.height)
      )

      // Expand face region slightly for better coverage
      let expandedRect = faceRect.insetBy(dx: -faceRect.width * 0.2, dy: -faceRect.height * 0.2)

      // Create blurred version of the face region
      let faceRegion = outputImage.cropped(to: expandedRect)

      // Apply Gaussian blur with proper clipping
      guard let blurFilter = CIFilter(name: "CIGaussianBlur") else { continue }
      blurFilter.setValue(faceRegion, forKey: kCIInputImageKey)
      blurFilter.setValue(Double(blurIntensity) / 2.0, forKey: kCIInputRadiusKey)

      guard var blurred = blurFilter.outputImage else { continue }

      // Crop to original extent to remove blur edges
      blurred = blurred.cropped(to: faceRegion.extent)

      // Translate blurred region back to original position
      blurred = blurred.transformed(by: CGAffineTransform(translationX: expandedRect.origin.x, y: expandedRect.origin.y))

      // Composite blurred region over the output image
      outputImage = blurred.composited(over: outputImage)
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

  private func detectFaces(in image: CIImage) -> [VNFaceObservation] {
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(ciImage: image, options: [:])

    do {
      try handler.perform([request])
      return request.results as? [VNFaceObservation] ?? []
    } catch {
      print("Face detection error: \(error)")
      return []
    }
  }
}
