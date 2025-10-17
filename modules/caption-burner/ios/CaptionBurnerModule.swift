import Foundation
import AVFoundation
import CoreImage
import UIKit
import QuartzCore

@objc(CaptionBurnerModule)
class CaptionBurnerModule: NSObject {

  @objc
  func burnCaptionsIntoVideo(
    _ inputPath: String,
    captionSegmentsJSON: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let outputPath = try self.processVideoWithCaptions(
          inputPath: inputPath,
          captionSegmentsJSON: captionSegmentsJSON,
          watermarkImagePath: nil,
          watermarkText: nil
        )
        resolve([
          "success": true,
          "outputPath": outputPath
        ])
      } catch {
        reject("CAPTION_BURN_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc
  func burnCaptionsAndWatermarkIntoVideo(
    _ inputPath: String,
    captionSegmentsJSON: String,
    watermarkImagePath: String?,
    watermarkText: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let outputPath = try self.processVideoWithCaptions(
          inputPath: inputPath,
          captionSegmentsJSON: captionSegmentsJSON,
          watermarkImagePath: watermarkImagePath,
          watermarkText: watermarkText
        )
        resolve([
          "success": true,
          "outputPath": outputPath
        ])
      } catch {
        reject("CAPTION_WATERMARK_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc
  func isAvailable(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    resolve(true)
  }
  
  // MARK: - Caption Data Structures
  
  struct CaptionWord: Codable {
    let word: String
    let startTime: Double
    let endTime: Double
    let confidence: Double?
    let isComplete: Bool?
  }
  
  struct CaptionSegment: Codable {
    let id: String
    let text: String
    let startTime: Double
    let endTime: Double
    let isComplete: Bool
    let words: [CaptionWord]
  }
  
  // MARK: - Video Processing

  private func processVideoWithCaptions(
    inputPath: String,
    captionSegmentsJSON: String,
    watermarkImagePath: String?,
    watermarkText: String?
  ) throws -> String {
    print("🎬 Starting caption burning process...")

    // Parse caption segments
    let segments = try parseCaptionSegments(json: captionSegmentsJSON)
    print("📝 Parsed \(segments.count) caption segments with \(segments.flatMap { $0.words }.count) total words")

    if watermarkImagePath != nil || watermarkText != nil {
      print("🏷️ Watermark will be applied")
    }
    
    // Convert input path to URL
    let inputURL: URL
    if inputPath.hasPrefix("file://") {
      inputURL = URL(string: inputPath)!
    } else {
      inputURL = URL(fileURLWithPath: inputPath)
    }
    
    // Create output URL
    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("captioned_\(UUID().uuidString).mov")
    
    // Load video asset
    let asset = AVAsset(url: inputURL)
    
    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      throw NSError(domain: "CaptionBurner", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
    }
    
    // Get video properties
    let videoSize = videoTrack.naturalSize
    let transform = videoTrack.preferredTransform
    let duration = asset.duration
    
    print("📹 Video size: \(videoSize), duration: \(CMTimeGetSeconds(duration))s")
    
    // Create composition
    let composition = AVMutableComposition()
    
    // Add video track
    guard let compositionVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "CaptionBurner", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to create video track"])
    }
    
    try compositionVideoTrack.insertTimeRange(
      CMTimeRange(start: .zero, duration: duration),
      of: videoTrack,
      at: .zero
    )
    compositionVideoTrack.preferredTransform = transform
    
    // Add audio track if available
    if let audioTrack = asset.tracks(withMediaType: .audio).first {
      print("🔊 Adding audio track")
      if let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ) {
        try compositionAudioTrack.insertTimeRange(
          CMTimeRange(start: .zero, duration: duration),
          of: audioTrack,
          at: .zero
        )
      }
    }
    
    // Create video composition with caption and watermark layers
    let videoComposition = try createVideoComposition(
      for: composition,
      videoSize: videoSize,
      transform: transform,
      segments: segments,
      duration: duration,
      watermarkImagePath: watermarkImagePath,
      watermarkText: watermarkText,
      sourceFrameRate: videoTrack.nominalFrameRate
    )
    
    // Export the video
    guard let exportSession = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      throw NSError(domain: "CaptionBurner", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to create export session"])
    }

    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mov
    exportSession.videoComposition = videoComposition
    exportSession.shouldOptimizeForNetworkUse = true

    // CRITICAL FIX: Log export session details for debugging
    print("📤 Export session created:")
    print("   - Input video tracks: \(composition.tracks(withMediaType: .video).count)")
    print("   - Input audio tracks: \(composition.tracks(withMediaType: .audio).count)")
    print("   - Video composition: \(videoComposition)")
    print("   - Render size: \(videoComposition.renderSize)")
    print("   - Frame duration: \(videoComposition.frameDuration)")
    print("   - Instructions: \(videoComposition.instructions.count)")
    
    print("🎬 Starting export...")
    
    // Export synchronously
    let semaphore = DispatchSemaphore(value: 0)
    var exportError: Error?
    
    exportSession.exportAsynchronously {
      if exportSession.status == .failed {
        exportError = exportSession.error
        print("❌ Export FAILED with error: \(String(describing: exportSession.error))")
      } else if exportSession.status == .completed {
        print("✅ Export COMPLETED successfully")
      } else {
        print("⚠️ Export status: \(exportSession.status.rawValue)")
      }
      semaphore.signal()
    }

    semaphore.wait()

    if let error = exportError {
      print("❌ Throwing export error: \(error.localizedDescription)")
      throw error
    }

    if exportSession.status != .completed {
      let errorMsg = "Export failed with status: \(exportSession.status.rawValue)"
      print("❌ \(errorMsg)")
      if let error = exportSession.error {
        print("❌ Export session error: \(error.localizedDescription)")
      }
      throw NSError(domain: "CaptionBurner", code: 4, userInfo: [NSLocalizedDescriptionKey: errorMsg])
    }

    // CRITICAL: Verify output file exists and has size
    let fileManager = FileManager.default
    if fileManager.fileExists(atPath: outputURL.path) {
      do {
        let attributes = try fileManager.attributesOfItem(atPath: outputURL.path)
        if let fileSize = attributes[.size] as? UInt64 {
          print("✅ Output file size: \(Double(fileSize) / 1_000_000.0) MB")
          if fileSize < 1000 {
            print("⚠️ WARNING: Output file is very small (\(fileSize) bytes)! Video may be corrupt.")
          }
        }
      } catch {
        print("⚠️ Could not get file size: \(error.localizedDescription)")
      }
    } else {
      print("❌ ERROR: Output file does not exist at: \(outputURL.path)")
      throw NSError(domain: "CaptionBurner", code: 5, userInfo: [NSLocalizedDescriptionKey: "Output file was not created"])
    }

    print("✅ Caption burning complete! Output: \(outputURL.path)")
    return outputURL.path
  }
  
  // MARK: - Video Composition with Captions

  private func createVideoComposition(
    for composition: AVMutableComposition,
    videoSize: CGSize,
    transform: CGAffineTransform,
    segments: [CaptionSegment],
    duration: CMTime,
    watermarkImagePath: String?,
    watermarkText: String?,
    sourceFrameRate: Float
  ) throws -> AVMutableVideoComposition {

    // Determine actual render size based on transform
    let renderSize = videoSize.applying(transform)
    let normalizedSize = CGSize(width: abs(renderSize.width), height: abs(renderSize.height))

    print("📐 Render size: \(normalizedSize)")

    // Create video composition
    let videoComposition = AVMutableVideoComposition()

    // CRITICAL FIX: Use source video's frame rate instead of hardcoding 30 FPS
    // This prevents black screen issues
    if sourceFrameRate > 0 {
      videoComposition.frameDuration = CMTime(value: 1, timescale: Int32(sourceFrameRate))
      print("📹 Using source frame rate: \(sourceFrameRate) FPS")
    } else {
      videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
      print("📹 Using default frame rate: 30 FPS")
    }

    videoComposition.renderSize = normalizedSize

    // Create layers
    let parentLayer = CALayer()
    let videoLayer = CALayer()
    let captionLayer = CALayer()
    let watermarkLayer = CALayer()

    parentLayer.frame = CGRect(origin: .zero, size: normalizedSize)
    videoLayer.frame = CGRect(origin: .zero, size: normalizedSize)
    captionLayer.frame = CGRect(origin: .zero, size: normalizedSize)
    watermarkLayer.frame = CGRect(origin: .zero, size: normalizedSize)

    // CRITICAL FIX: Do NOT add videoLayer as sublayer!
    // When using postProcessingAsVideoLayer, the videoLayer represents the actual video frames
    // and should NOT be added as a sublayer. It's automatically composited by AVFoundation
    // BEHIND the parentLayer.
    // Adding it as a sublayer creates an empty black layer that blocks the video!

    // parentLayer.addSublayer(videoLayer) // ❌ REMOVED - This was causing black video!

    // Add watermark layer (below captions)
    if watermarkImagePath != nil || watermarkText != nil {
      createWatermarkLayer(
        in: watermarkLayer,
        imagePath: watermarkImagePath,
        text: watermarkText,
        videoSize: normalizedSize,
        duration: duration
      )
      parentLayer.addSublayer(watermarkLayer)
    }

    // Create caption text layers for each word with timing
    createCaptionLayers(in: captionLayer, segments: segments, videoSize: normalizedSize, duration: duration)

    // Add caption layer on top
    parentLayer.addSublayer(captionLayer)
    
    // Create animation tool
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )
    
    // Create instruction
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
    
    guard let track = composition.tracks(withMediaType: .video).first else {
      throw NSError(domain: "CaptionBurner", code: 5, userInfo: [NSLocalizedDescriptionKey: "No video track in composition"])
    }
    
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
    layerInstruction.setTransform(transform, at: .zero)
    
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]
    
    return videoComposition
  }
  
  // MARK: - Caption Layer Creation (TikTok Style)
  
  private func createCaptionLayers(
    in parentLayer: CALayer,
    segments: [CaptionSegment],
    videoSize: CGSize,
    duration: CMTime
  ) {
    print("🎨 Creating caption layers for \(segments.count) segments")

    // ✅ FIX: TikTok-style caption positioning (lower on screen for better visibility)
    let captionWidth = videoSize.width * 0.85
    let captionHeight: CGFloat = 150
    let captionY = videoSize.height * 0.70 // 70% down from top (lower than before)

    // ✅ FIX: Create a single text layer per segment (not per word) for better readability
    for segment in segments {
      let textLayer = createSegmentLayer(
        segment: segment,
        frame: CGRect(
          x: (videoSize.width - captionWidth) / 2,
          y: captionY,
          width: captionWidth,
          height: captionHeight
        )
      )

      // Add fade in/out animations
      addSegmentAnimations(to: textLayer, segment: segment, duration: duration)

      parentLayer.addSublayer(textLayer)
    }

    print("✅ Created \(parentLayer.sublayers?.count ?? 0) caption layers")
  }
  
  // ✅ FIX: Create segment layer instead of word layer for better display
  private func createSegmentLayer(segment: CaptionSegment, frame: CGRect) -> CATextLayer {
    let textLayer = CATextLayer()
    textLayer.frame = frame
    textLayer.string = segment.text.uppercased()

    // ✅ FIX: Enhanced TikTok-style font and styling
    let fontSize: CGFloat = 52 // Larger font
    let font = UIFont.systemFont(ofSize: fontSize, weight: .black) // Heavier weight
    textLayer.font = font
    textLayer.fontSize = fontSize
    textLayer.foregroundColor = UIColor.white.cgColor
    textLayer.alignmentMode = .center
    textLayer.isWrapped = true

    // ✅ FIX: Stronger shadow for better readability
    textLayer.shadowColor = UIColor.black.cgColor
    textLayer.shadowOffset = CGSize(width: 0, height: 0)
    textLayer.shadowOpacity = 1.0
    textLayer.shadowRadius = 12 // Larger shadow radius

    // Add background for better contrast
    textLayer.backgroundColor = UIColor.black.withAlphaComponent(0.7).cgColor
    textLayer.cornerRadius = 12
    textLayer.masksToBounds = false

    // Start invisible
    textLayer.opacity = 0

    return textLayer
  }

  private func addSegmentAnimations(to layer: CATextLayer, segment: CaptionSegment, duration: CMTime) {
    let startTime = segment.startTime
    let endTime = segment.endTime

    // ✅ FIX: Smoother fade in animation
    let fadeIn = CABasicAnimation(keyPath: "opacity")
    fadeIn.fromValue = 0.0
    fadeIn.toValue = 1.0
    fadeIn.duration = 0.15 // Slightly slower for smoother transition
    fadeIn.beginTime = startTime
    fadeIn.fillMode = .forwards
    fadeIn.isRemovedOnCompletion = false

    // ✅ FIX: Smoother fade out animation
    let fadeOut = CABasicAnimation(keyPath: "opacity")
    fadeOut.fromValue = 1.0
    fadeOut.toValue = 0.0
    fadeOut.duration = 0.15
    fadeOut.beginTime = max(startTime, endTime - 0.15) // Ensure fade out doesn't start before fade in
    fadeOut.fillMode = .forwards
    fadeOut.isRemovedOnCompletion = false

    // ✅ FIX: Subtle scale animation (TikTok pop effect)
    let scaleUp = CABasicAnimation(keyPath: "transform.scale")
    scaleUp.fromValue = 0.9
    scaleUp.toValue = 1.0
    scaleUp.duration = 0.15
    scaleUp.beginTime = startTime
    scaleUp.fillMode = .forwards
    scaleUp.isRemovedOnCompletion = false

    // Add all animations
    layer.add(fadeIn, forKey: "fadeIn")
    layer.add(fadeOut, forKey: "fadeOut")
    layer.add(scaleUp, forKey: "scaleUp")
  }

  // MARK: - Watermark Layer Creation

  private func createWatermarkLayer(
    in parentLayer: CALayer,
    imagePath: String?,
    text: String?,
    videoSize: CGSize,
    duration: CMTime
  ) {
    print("🏷️ Creating watermark layer")

    // Watermark container positioned in top right corner
    let watermarkWidth: CGFloat = 200
    let watermarkHeight: CGFloat = 80
    let padding: CGFloat = 20

    let containerLayer = CALayer()
    containerLayer.frame = CGRect(
      x: videoSize.width - watermarkWidth - padding,
      y: padding,
      width: watermarkWidth,
      height: watermarkHeight
    )

    var currentY: CGFloat = 0

    // Add logo image if provided
    if let imagePath = imagePath {
      if let logoLayer = createLogoLayer(imagePath: imagePath, width: watermarkWidth) {
        logoLayer.frame.origin.y = currentY
        containerLayer.addSublayer(logoLayer)
        currentY += logoLayer.frame.height + 5
      }
    }

    // Add text if provided
    if let text = text {
      let textLayer = createWatermarkTextLayer(text: text, width: watermarkWidth)
      textLayer.frame.origin.y = currentY
      containerLayer.addSublayer(textLayer)
    }

    // Make watermark semi-transparent
    containerLayer.opacity = 0.85

    parentLayer.addSublayer(containerLayer)
    print("✅ Watermark layer created")
  }

  private func createLogoLayer(imagePath: String, width: CGFloat) -> CALayer? {
    let logoURL: URL
    if imagePath.hasPrefix("file://") {
      logoURL = URL(string: imagePath)!
    } else {
      logoURL = URL(fileURLWithPath: imagePath)
    }

    guard let imageData = try? Data(contentsOf: logoURL),
          let image = UIImage(data: imageData)?.cgImage else {
      print("⚠️ Failed to load watermark image from: \(imagePath)")
      return nil
    }

    let aspectRatio = CGFloat(image.width) / CGFloat(image.height)
    let logoHeight = width / aspectRatio * 0.6 // Scale down to 60% of calculated height

    let logoLayer = CALayer()
    logoLayer.contents = image
    logoLayer.frame = CGRect(x: 0, y: 0, width: width, height: logoHeight)
    logoLayer.contentsGravity = .resizeAspect

    return logoLayer
  }

  private func createWatermarkTextLayer(text: String, width: CGFloat) -> CATextLayer {
    let textLayer = CATextLayer()
    textLayer.frame = CGRect(x: 0, y: 0, width: width, height: 30)
    textLayer.string = text

    let fontSize: CGFloat = 18
    let font = UIFont.systemFont(ofSize: fontSize, weight: .semibold)
    textLayer.font = font
    textLayer.fontSize = fontSize
    textLayer.foregroundColor = UIColor.white.cgColor
    textLayer.alignmentMode = .center
    textLayer.isWrapped = false

    // Add shadow for better readability
    textLayer.shadowColor = UIColor.black.cgColor
    textLayer.shadowOffset = CGSize(width: 0, height: 0)
    textLayer.shadowOpacity = 0.8
    textLayer.shadowRadius = 4

    return textLayer
  }

  // MARK: - JSON Parsing

  private func parseCaptionSegments(json: String) throws -> [CaptionSegment] {
    guard let data = json.data(using: .utf8) else {
      throw NSError(domain: "CaptionBurner", code: 6, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON string"])
    }

    let decoder = JSONDecoder()
    let segments = try decoder.decode([CaptionSegment].self, from: data)

    // Allow empty segments - watermark can be added without captions
    // if segments.isEmpty {
    //   throw NSError(domain: "CaptionBurner", code: 7, userInfo: [NSLocalizedDescriptionKey: "No caption segments found"])
    // }

    return segments
  }
}

