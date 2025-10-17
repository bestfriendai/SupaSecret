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

  // Enhanced face tracking system for moving faces
  private var trackedFaces: [TrackedFace] = []
  private var framesSinceLastDetection = 0
  private var frameCount = 0
  private var lastDetectionTime = CFAbsoluteTimeGetCurrent()

  // Face tracking data structure
  private struct TrackedFace {
    let id: UUID
    var observations: [VNFaceObservation]
    var positions: [CGRect]
    var velocities: [CGPoint]
    var lastSeen: Int
    var confidence: Float
    var isMoving: Bool

    init(observation: VNFaceObservation, frameNumber: Int) {
      self.id = UUID()
      self.observations = [observation]
      self.positions = [observation.boundingBox]
      self.velocities = []
      self.lastSeen = frameNumber
      self.confidence = observation.confidence
      self.isMoving = false
    }

    mutating func update(with observation: VNFaceObservation, frameNumber: Int) {
      observations.append(observation)
      positions.append(observation.boundingBox)
      lastSeen = frameNumber
      confidence = max(confidence, observation.confidence)

      // Calculate velocity if we have previous positions
      if positions.count >= 2 {
        let current = positions[positions.count - 1]
        let previous = positions[positions.count - 2]
        let velocity = CGPoint(
          x: current.midX - previous.midX,
          y: current.midY - previous.midY
        )
        velocities.append(velocity)

        // ✅ IMPROVED: More sensitive movement detection
        let speed = sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
        isMoving = speed > 0.01 // Lowered from 0.02 to 0.01 for more sensitive detection
      }

      // Keep only recent data (last 10 frames)
      if observations.count > 10 {
        observations.removeFirst()
        positions.removeFirst()
        if !velocities.isEmpty {
          velocities.removeFirst()
        }
      }
    }

    func predictNextPosition() -> CGRect? {
      guard let lastPosition = positions.last,
            let lastVelocity = velocities.last else {
        return positions.last
      }

      // Simple linear prediction
      return CGRect(
        x: lastPosition.origin.x + lastVelocity.x,
        y: lastPosition.origin.y + lastVelocity.y,
        width: lastPosition.width,
        height: lastPosition.height
      )
    }
  }

  @objc
  func blurFacesInVideo(_ inputPath: String, blurIntensity: NSInteger, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      // Reset tracking system for new video
      self.resetTracking()

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

  // Reset tracking system
  private func resetTracking() {
    trackedFaces.removeAll()
    framesSinceLastDetection = 0
    frameCount = 0
    lastDetectionTime = CFAbsoluteTimeGetCurrent()
    print("🔄 Face tracking system reset")
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
    self.resetTracking()

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
    frameCount += 1

    // ✅ IMPROVED: Detect faces EVERY frame for maximum coverage
    // This ensures we never miss a face, even when moving quickly
    let newFaces = detectFaces(in: ciImage, orientation: orientation)
    updateTrackedFaces(with: newFaces)
    framesSinceLastDetection = 0
    lastDetectionTime = CFAbsoluteTimeGetCurrent()

    // Clean up old tracked faces (not seen for 5 frames - shorter window for faster cleanup)
    trackedFaces.removeAll { frameCount - $0.lastSeen > 5 }

    // Get current face positions (either detected or predicted)
    let currentFaceRects = getCurrentFaceRects()

    // If no faces detected or predicted, return original
    if currentFaceRects.isEmpty {
      // Log occasionally to show we're checking
      let now = Date()
      if now.timeIntervalSince(lastFaceDetectionLog) > 1.0 {
        print("🔍 No faces detected or tracked in current frames")
        lastFaceDetectionLog = now
      }
      return imageBuffer
    }

    // Apply pixelation to face regions (better privacy than blur)
    var outputImage = ciImage

    for (index, faceRect) in currentFaceRects.enumerated() {
      // Convert normalized coordinates to image coordinates
      let imageSize = ciImage.extent.size
      let actualRect = CGRect(
        x: faceRect.origin.x * imageSize.width,
        y: faceRect.origin.y * imageSize.height,
        width: faceRect.width * imageSize.width,
        height: faceRect.height * imageSize.height
      )

      // ✅ IMPROVED: Larger expansion to ensure full face coverage even when moving
      let expansionFactor: CGFloat = 0.35 // Increased from 0.20-0.25 to 0.35 for better coverage
      let expandedRect = actualRect.insetBy(dx: -actualRect.width * expansionFactor, dy: -actualRect.height * expansionFactor)

      // Clamp to image bounds
      let clampedRect = expandedRect.intersection(ciImage.extent)

      if index == 0 && frameCount % 30 == 0 {
        print("🎭 Blurring face \(index + 1): rect=\(clampedRect)")
      }

      // Create pixelated version of the face region
      let faceRegion = outputImage.cropped(to: clampedRect)

      // ✅ IMPROVED: Use stronger pixelation for better privacy
      guard let pixellateFilter = CIFilter(name: "CIPixellate") else {
        print("❌ Failed to create pixellate filter")
        continue
      }

      // Scale determines pixelation size (higher = more pixelated)
      // Increased intensity for better face obscuring
      let baseIntensity = Double(blurIntensity)
      let pixelScale = max(baseIntensity + 15.0, 35.0) // Increased from 25.0 to 35.0 for stronger effect
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

  // Update tracked faces with new detections
  private func updateTrackedFaces(with newFaces: [VNFaceObservation]) {
    // Match new faces with existing tracked faces
    for newFace in newFaces {
      var matched = false

      // Try to match with existing tracked faces
      for i in 0..<trackedFaces.count {
        let trackedFace = trackedFaces[i]

        // Calculate distance between face centers
        let newCenter = CGPoint(x: newFace.boundingBox.midX, y: newFace.boundingBox.midY)
        let trackedCenter = CGPoint(x: trackedFace.positions.last?.midX ?? 0, y: trackedFace.positions.last?.midY ?? 0)

        let distance = sqrt(pow(newCenter.x - trackedCenter.x, 2) + pow(newCenter.y - trackedCenter.y, 2))

        // ✅ IMPROVED: Increased threshold for better face matching when moving
        if distance < 0.15 { // Increased from 0.1 to 0.15 for better tracking of moving faces
          trackedFaces[i].update(with: newFace, frameNumber: frameCount)
          matched = true
          break
        }
      }

      // If no match found, create new tracked face
      if !matched {
        let newTrackedFace = TrackedFace(observation: newFace, frameNumber: frameCount)
        trackedFaces.append(newTrackedFace)
        print("👤 New face detected and tracked (ID: \(newTrackedFace.id))")
      }
    }
  }

  // Get current face rectangles (detected or predicted)
  private func getCurrentFaceRects() -> [CGRect] {
    var faceRects: [CGRect] = []

    for trackedFace in trackedFaces {
      // If face was recently detected, use actual position
      if frameCount - trackedFace.lastSeen <= 2 {
        if let lastPosition = trackedFace.positions.last {
          faceRects.append(lastPosition)
        }
      }
      // If face is moving and not recently detected, use prediction
      else if trackedFace.isMoving, let predictedPosition = trackedFace.predictNextPosition() {
        faceRects.append(predictedPosition)
        print("🔮 Using predicted position for moving face (ID: \(trackedFace.id))")
      }
      // For stationary faces, use last known position for a few more frames
      else if frameCount - trackedFace.lastSeen <= 5 {
        if let lastPosition = trackedFace.positions.last {
          faceRects.append(lastPosition)
        }
      }
    }

    return faceRects
  }

  private func detectFaces(in image: CIImage, orientation: CGImagePropertyOrientation) -> [VNFaceObservation] {
    // Use enhanced face detection with landmarks for better tracking
    let request = VNDetectFaceLandmarksRequest()

    // Configure for better detection of moving faces
    request.revision = VNDetectFaceLandmarksRequestRevision3 // Latest revision

    // Set options for better detection with correct orientation
    let handler = VNImageRequestHandler(ciImage: image, orientation: orientation, options: [
      VNImageOption.cameraIntrinsics: NSNull() // Helps with camera distortion
    ])

    do {
      try handler.perform([request])
      let results = request.results as? [VNFaceObservation] ?? []

      // ✅ IMPROVED: Even lower confidence threshold to catch more faces (side profiles, partial faces)
      let filteredResults = results.filter { $0.confidence > 0.3 } // Lowered from 0.4 to 0.3

      // Log detection results for debugging (less frequently to reduce noise)
      if !filteredResults.isEmpty && frameCount % 30 == 0 {
        print("✅ Detected \(filteredResults.count) face(s) in frame \(frameCount)")
        for (index, face) in filteredResults.enumerated() {
          let landmarks = face.landmarks?.allPoints?.pointCount ?? 0
          print("  Face \(index + 1): bounds=\(face.boundingBox), confidence=\(face.confidence), landmarks=\(landmarks)")
        }
      }

      return filteredResults
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
