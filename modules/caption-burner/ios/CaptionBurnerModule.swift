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
        // Check if captions are empty
        let captionSegmentsJSON = captionSegmentsJSON.trimmingCharacters(in: .whitespacesAndNewlines)
        let isWatermarkOnly = captionSegmentsJSON == "[]" || captionSegmentsJSON.isEmpty

        if isWatermarkOnly && (watermarkImagePath != nil || watermarkText != nil) {
          // Use super simple watermark-only approach
          print("🎬 Using simplified watermark-only processing")
          let outputPath = try self.processVideoWithSimpleWatermark(
            inputPath: inputPath,
            watermarkImagePath: watermarkImagePath,
            watermarkText: watermarkText
          )
          resolve([
            "success": true,
            "outputPath": outputPath
          ])
        } else {
          // Use full caption processing
          print("🎬 Using full caption processing pipeline")
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
        }
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
    print("📂 Input path: \(inputPath)")

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

    // CRITICAL: Validate input video file exists and is readable
    let fileManager = FileManager.default
    let filePath = inputURL.path

    print("🔍 Validating input video file...")
    print("   - Path: \(filePath)")
    print("   - Exists: \(fileManager.fileExists(atPath: filePath))")

    if fileManager.fileExists(atPath: filePath) {
      do {
        let attributes = try fileManager.attributesOfItem(atPath: filePath)
        let fileSize = attributes[.size] as? Int64 ?? 0
        print("   - Size: \(fileSize) bytes (\(Double(fileSize) / 1024.0 / 1024.0) MB)")

        if fileSize == 0 {
          throw NSError(domain: "CaptionBurner", code: 0, userInfo: [NSLocalizedDescriptionKey: "Input video file is empty (0 bytes)"])
        }
      } catch {
        print("❌ Failed to get file attributes: \(error)")
        throw error
      }
    } else {
      throw NSError(domain: "CaptionBurner", code: 0, userInfo: [NSLocalizedDescriptionKey: "Input video file does not exist at path: \(filePath)"])
    }

    // Create output URL
    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("captioned_\(UUID().uuidString).mov")

    print("📤 Output will be saved to: \(outputURL.path)")

    // Load video asset
    let asset = AVAsset(url: inputURL)

    // CRITICAL: Validate asset is loadable
    print("🎥 Loading video asset...")
    let tracks = asset.tracks(withMediaType: .video)
    print("   - Video tracks found: \(tracks.count)")

    guard let videoTrack = tracks.first else {
      throw NSError(domain: "CaptionBurner", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found in asset. The video file may be corrupted or invalid."])
    }

    // Get video properties
    let videoSize = videoTrack.naturalSize
    let transform = videoTrack.preferredTransform
    let duration = asset.duration
    let frameRate = videoTrack.nominalFrameRate

    print("📹 Video properties:")
    print("   - Size: \(videoSize)")
    print("   - Duration: \(CMTimeGetSeconds(duration))s")
    print("   - Frame rate: \(frameRate) FPS")
    print("   - Transform: \(transform)")
    print("   - Transform.a: \(transform.a), .b: \(transform.b), .c: \(transform.c), .d: \(transform.d)")
    print("   - Transform.tx: \(transform.tx), .ty: \(transform.ty)")

    // Check if this is an identity transform (video already oriented correctly)
    let isIdentityTransform = transform.isIdentity
    print("   - Is identity transform: \(isIdentityTransform)")
    
    // Create composition
    print("🎬 Creating video composition...")
    let composition = AVMutableComposition()

    // Add video track
    guard let compositionVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "CaptionBurner", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to create video track in composition"])
    }

    print("✅ Video track created in composition")

    do {
      try compositionVideoTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: duration),
        of: videoTrack,
        at: .zero
      )
      print("✅ Video track inserted into composition")
    } catch {
      print("❌ Failed to insert video track: \(error)")
      throw NSError(domain: "CaptionBurner", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to insert video track into composition: \(error.localizedDescription)"])
    }

    // Apply the original transform to the composition track
    print("   - Setting composition track transform: \(transform)")
    compositionVideoTrack.preferredTransform = transform

    // Add audio track if available
    let audioTracks = asset.tracks(withMediaType: .audio)
    print("🔊 Audio tracks found: \(audioTracks.count)")

    if let audioTrack = audioTracks.first {
      print("🔊 Adding audio track to composition")
      if let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ) {
        do {
          try compositionAudioTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: duration),
            of: audioTrack,
            at: .zero
          )
          print("✅ Audio track inserted successfully")
        } catch {
          print("⚠️ Failed to insert audio track: \(error)")
          // Continue without audio rather than failing
        }
      }
    } else {
      print("⚠️ No audio track found in source video")
    }

    // Create video composition with caption and watermark layers
    print("🎨 Creating video composition with captions and watermark...")
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
    print("✅ Video composition created successfully")

    // Export the video
    print("📤 Creating export session...")
    guard let exportSession = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      throw NSError(domain: "CaptionBurner", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to create export session - AVAssetExportSession returned nil"])
    }

    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mov
    exportSession.videoComposition = videoComposition
    exportSession.shouldOptimizeForNetworkUse = true

    // CRITICAL: Log export session details for debugging
    print("📤 Export session configuration:")
    print("   - Input video tracks: \(composition.tracks(withMediaType: .video).count)")
    print("   - Input audio tracks: \(composition.tracks(withMediaType: .audio).count)")
    print("   - Output URL: \(outputURL.path)")
    print("   - Output file type: .mov")
    print("   - Render size: \(videoComposition.renderSize)")
    print("   - Frame duration: \(videoComposition.frameDuration)")
    print("   - Frame rate: \(1.0 / CMTimeGetSeconds(videoComposition.frameDuration)) FPS")
    print("   - Instructions count: \(videoComposition.instructions.count)")

    // Validate composition has content
    if composition.tracks(withMediaType: .video).isEmpty {
      throw NSError(domain: "CaptionBurner", code: 4, userInfo: [NSLocalizedDescriptionKey: "Composition has no video tracks - this should never happen!"])
    }

    print("🎬 Starting export...")
    print("   - This may take a few seconds depending on video length...")

    // Export synchronously
    let semaphore = DispatchSemaphore(value: 0)
    var exportError: Error?
    let exportStartTime = Date()

    exportSession.exportAsynchronously {
      let exportDuration = Date().timeIntervalSince(exportStartTime)

      if exportSession.status == .failed {
        exportError = exportSession.error
        print("❌ Export FAILED after \(exportDuration)s")
        print("❌ Error: \(String(describing: exportSession.error))")
        print("❌ Error domain: \(String(describing: exportSession.error?._domain))")
        print("❌ Error code: \(String(describing: exportSession.error?._code))")

        // Log detailed error information
        if let error = exportSession.error as NSError? {
          print("❌ Error userInfo: \(error.userInfo)")
        }
      } else if exportSession.status == .completed {
        print("✅ Export COMPLETED successfully in \(exportDuration)s")
      } else if exportSession.status == .cancelled {
        print("⚠️ Export was CANCELLED after \(exportDuration)s")
      } else {
        print("⚠️ Export ended with unexpected status: \(exportSession.status.rawValue) after \(exportDuration)s")
      }
      semaphore.signal()
    }

    semaphore.wait()

    if let error = exportError {
      print("❌ Throwing export error: \(error.localizedDescription)")

      // Provide more helpful error message
      var errorMessage = "Video export failed: \(error.localizedDescription)"
      if let nsError = error as NSError? {
        if nsError.domain == "AVFoundationErrorDomain" {
          errorMessage += "\n\nThis may be caused by:"
          errorMessage += "\n• Corrupted input video file"
          errorMessage += "\n• Invalid video codec or format"
          errorMessage += "\n• Insufficient storage space"
          errorMessage += "\n• Video composition configuration issue"
        }
      }

      throw NSError(domain: "CaptionBurner", code: 5, userInfo: [
        NSLocalizedDescriptionKey: errorMessage,
        NSUnderlyingErrorKey: error
      ])
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
    print("🔍 Verifying output file...")
    if fileManager.fileExists(atPath: outputURL.path) {
      do {
        let attributes = try fileManager.attributesOfItem(atPath: outputURL.path)
        if let fileSize = attributes[FileAttributeKey.size] as? UInt64 {
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
  
  // MARK: - Super Simple Watermark Processing

  private func processVideoWithSimpleWatermark(
    inputPath: String,
    watermarkImagePath: String?,
    watermarkText: String?
  ) throws -> String {
    print("===============================================")
    print("🎬 SIMPLE WATERMARK PROCESSING STARTED")
    print("===============================================")
    print("📂 Input path: \(inputPath)")
    print("🖼️ Watermark image path: \(watermarkImagePath ?? "nil")")
    print("📝 Watermark text: \(watermarkText ?? "nil")")

    // Convert to URL
    let inputURL: URL
    if inputPath.hasPrefix("file://") {
      inputURL = URL(string: inputPath)!
    } else {
      inputURL = URL(fileURLWithPath: inputPath)
    }

    // Validate input
    let fileManager = FileManager.default
    print("🔍 Checking if input file exists at: \(inputURL.path)")
    let inputExists = fileManager.fileExists(atPath: inputURL.path)
    print("🔍 Input file exists: \(inputExists)")

    guard inputExists else {
      print("❌ ERROR: Input video not found!")
      throw NSError(domain: "CaptionBurner", code: 0, userInfo: [
        NSLocalizedDescriptionKey: "Input video not found at: \(inputURL.path)"
      ])
    }

    // Output URL
    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("simple_watermark_\(UUID().uuidString).mov")

    print("📤 Output will be saved to: \(outputURL.path)")

    // Load asset
    print("🎥 Loading video asset...")
    let asset = AVAsset(url: inputURL)
    let videoTracks = asset.tracks(withMediaType: .video)
    print("🎥 Found \(videoTracks.count) video track(s)")

    guard let videoTrack = videoTracks.first else {
      print("❌ ERROR: No video track found in asset!")
      throw NSError(domain: "CaptionBurner", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "No video track found"
      ])
    }

    // Create composition - just pass through the video
    let composition = AVMutableComposition()

    // Add video
    guard let compVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "CaptionBurner", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create composition video track"
      ])
    }

    try compVideoTrack.insertTimeRange(
      CMTimeRange(start: .zero, duration: asset.duration),
      of: videoTrack,
      at: .zero
    )
    compVideoTrack.preferredTransform = videoTrack.preferredTransform

    // Add audio
    if let audioTrack = asset.tracks(withMediaType: .audio).first,
       let compAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
       ) {
      try? compAudioTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: asset.duration),
        of: audioTrack,
        at: .zero
      )
    }

    // If no watermark needed, just export composition
    if watermarkImagePath == nil && watermarkText == nil {
      print("⚠️ No watermark specified, exporting original video")
      return try exportComposition(composition, to: outputURL, videoComposition: nil)
    }

    // Get video properties
    let transform = videoTrack.preferredTransform
    let videoSize = videoTrack.naturalSize
    let frameRate = videoTrack.nominalFrameRate

    print("📹 Video properties:")
    print("   - Natural size: \(videoSize)")
    print("   - Transform: \(transform)")
    print("   - Frame rate: \(frameRate)")

    // CRITICAL FIX: Use AVMutableVideoComposition(propertiesOf:) to automatically
    // handle ALL the complex transform/sizing/timing configuration
    // Manual configuration was creating corrupt 61KB files
    print("🎬 Creating video composition using propertiesOf (automatic config)")
    let videoComposition = AVMutableVideoComposition(propertiesOf: asset)

    // The renderSize is automatically calculated correctly by propertiesOf
    print("✅ Automatic render size: \(videoComposition.renderSize)")
    print("✅ Automatic frame duration: \(videoComposition.frameDuration)")
    print("✅ Automatic instructions: \(videoComposition.instructions.count)")

    // Load watermark image if provided
    var watermarkImage: CGImage?
    if let imagePath = watermarkImagePath {
      print("🖼️ Loading watermark image from: \(imagePath)")

      let logoURL: URL
      if imagePath.hasPrefix("file://") {
        logoURL = URL(string: imagePath)!
      } else {
        logoURL = URL(fileURLWithPath: imagePath)
      }

      print("🖼️ Logo URL: \(logoURL.path)")
      print("🖼️ File exists: \(FileManager.default.fileExists(atPath: logoURL.path))")

      if let data = try? Data(contentsOf: logoURL) {
        print("🖼️ Loaded \(data.count) bytes of image data")
        if let img = UIImage(data: data) {
          print("🖼️ Created UIImage: \(img.size)")
          watermarkImage = img.cgImage
          print("✅ Successfully loaded watermark image")
        } else {
          print("❌ Failed to create UIImage from data")
        }
      } else {
        print("❌ Failed to load data from: \(logoURL.path)")
      }
    }

    // Create watermark overlay layer
    let parentLayer = CALayer()
    let videoLayer = CALayer()
    let overlayLayer = CALayer()

    // Use the render size from the automatically configured video composition
    let renderSize = videoComposition.renderSize
    print("🎨 Using render size for layers: \(renderSize)")

    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    overlayLayer.frame = CGRect(origin: .zero, size: renderSize)

    // Add watermark image if we have one
    if let image = watermarkImage {
      let imageLayer = CALayer()
      let imageWidth: CGFloat = 120
      let imageHeight: CGFloat = 40
      imageLayer.contents = image
      imageLayer.frame = CGRect(
        x: renderSize.width - imageWidth - 20,
        y: renderSize.height - imageHeight - 20,
        width: imageWidth,
        height: imageHeight
      )
      imageLayer.contentsGravity = .resizeAspect
      imageLayer.opacity = 0.9
      overlayLayer.addSublayer(imageLayer)
      print("✅ Added logo watermark at bottom-right")
    } else {
      print("⚠️ No logo image to add")
    }

    // Add text watermark if provided
    if let text = watermarkText {
      let textLayer = CATextLayer()
      textLayer.string = text
      textLayer.fontSize = 16
      textLayer.foregroundColor = UIColor.white.cgColor
      textLayer.backgroundColor = UIColor.black.withAlphaComponent(0.5).cgColor
      textLayer.alignmentMode = .center
      textLayer.frame = CGRect(
        x: 20,
        y: renderSize.height - 60,
        width: 200,
        height: 30
      )
      textLayer.cornerRadius = 8
      overlayLayer.addSublayer(textLayer)
      print("✅ Added text watermark at bottom-left")
    }

    // CRITICAL: Do NOT add videoLayer to parentLayer!
    // When using postProcessingAsVideoLayer, AVFoundation automatically renders
    // video frames into videoLayer. Adding it as a sublayer causes black screen.
    // Only add overlay layers to parentLayer.
    print("🎨 Adding overlay layer to parent (NOT videoLayer)")
    parentLayer.addSublayer(overlayLayer)
    print("🎨 Parent layer sublayers count: \(parentLayer.sublayers?.count ?? 0)")

    print("🎬 Creating animation tool with postProcessingAsVideoLayer")
    // CRITICAL: Set the animation tool which adds the watermark overlays
    // Do NOT modify videoComposition.instructions - they're already correct from propertiesOf
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )

    print("✅ Simple watermark composition created successfully")
    print("   - Final render size: \(videoComposition.renderSize)")
    print("   - Final frame duration: \(videoComposition.frameDuration)")
    print("   - Final instructions: \(videoComposition.instructions.count)")

    print("📤 Starting export process...")
    return try exportComposition(composition, to: outputURL, videoComposition: videoComposition)
  }

  // Helper to export composition
  private func exportComposition(
    _ composition: AVComposition,
    to outputURL: URL,
    videoComposition: AVVideoComposition?
  ) throws -> String {
    print("===============================================")
    print("📤 EXPORT SESSION STARTING")
    print("===============================================")
    print("📤 Output URL: \(outputURL.path)")
    print("📤 Composition has video tracks: \(composition.tracks(withMediaType: .video).count)")
    print("📤 Composition has audio tracks: \(composition.tracks(withMediaType: .audio).count)")
    print("📤 Video composition provided: \(videoComposition != nil)")

    guard let exportSession = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      print("❌ ERROR: Failed to create AVAssetExportSession!")
      throw NSError(domain: "CaptionBurner", code: 3, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create export session"
      ])
    }

    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mov
    exportSession.videoComposition = videoComposition
    exportSession.shouldOptimizeForNetworkUse = true

    print("📤 Export session configured successfully")
    print("📤 Preset: AVAssetExportPresetHighestQuality")
    print("📤 Output file type: .mov")
    print("📤 Starting asynchronous export...")

    let semaphore = DispatchSemaphore(value: 0)
    var exportError: Error?
    let exportStartTime = Date()

    exportSession.exportAsynchronously {
      let exportDuration = Date().timeIntervalSince(exportStartTime)

      if exportSession.status == .completed {
        print("✅ ========== EXPORT COMPLETED ==========")
        print("✅ Export took \(String(format: "%.2f", exportDuration)) seconds")
        print("✅ Output saved to: \(outputURL.path)")
      } else {
        exportError = exportSession.error ?? NSError(
          domain: "CaptionBurner",
          code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Export failed with status: \(exportSession.status.rawValue)"]
        )
        print("❌ ========== EXPORT FAILED ==========")
        print("❌ Export took \(String(format: "%.2f", exportDuration)) seconds")
        print("❌ Status: \(exportSession.status.rawValue)")
        print("❌ Error: \(exportError!.localizedDescription)")
        if let nsError = exportError as? NSError {
          print("❌ Error domain: \(nsError.domain)")
          print("❌ Error code: \(nsError.code)")
          print("❌ Error userInfo: \(nsError.userInfo)")
        }
      }
      semaphore.signal()
    }

    semaphore.wait()

    if let error = exportError {
      print("❌ Throwing export error")
      throw error
    }

    // Verify output
    print("🔍 Verifying output file...")
    let outputExists = FileManager.default.fileExists(atPath: outputURL.path)
    print("🔍 Output file exists: \(outputExists)")

    if outputExists {
      if let attributes = try? FileManager.default.attributesOfItem(atPath: outputURL.path),
         let fileSize = attributes[.size] as? Int64 {
        print("✅ Output file size: \(fileSize) bytes (\(Double(fileSize) / 1_000_000.0) MB)")
      }
    }

    guard outputExists else {
      print("❌ ERROR: Output file was not created!")
      throw NSError(domain: "CaptionBurner", code: 5, userInfo: [
        NSLocalizedDescriptionKey: "Output file was not created"
      ])
    }

    print("===============================================")
    print("✅ WATERMARK PROCESSING COMPLETE")
    print("===============================================")
    return outputURL.path
  }

  // MARK: - Simplified Watermark-Only Processing
  
  private func processVideoWithWatermarkOnly(
    inputPath: String,
    watermarkImagePath: String?,
    watermarkText: String?
  ) throws -> String {
    print("🎬 Starting simplified watermark-only process...")
    print("📂 Input path: \(inputPath)")

    // Convert input path to URL
    let inputURL: URL
    if inputPath.hasPrefix("file://") {
      inputURL = URL(string: inputPath)!
    } else {
      inputURL = URL(fileURLWithPath: inputPath)
    }

    // Validate input video file
    let fileManager = FileManager.default
    let filePath = inputURL.path

    print("🔍 Validating input video file...")
    if !fileManager.fileExists(atPath: filePath) {
      throw NSError(domain: "CaptionBurner", code: 0, userInfo: [NSLocalizedDescriptionKey: "Input video file does not exist at path: \(filePath)"])
    }

    // Create output URL
    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("watermark_\(UUID().uuidString).mov")

    print("📤 Output will be saved to: \(outputURL.path)")

    // Load video asset
    let asset = AVAsset(url: inputURL)

    // Validate asset
    let tracks = asset.tracks(withMediaType: .video)
    guard let videoTrack = tracks.first else {
      throw NSError(domain: "CaptionBurner", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found in asset."])
    }

    let duration = asset.duration
    let frameRate = videoTrack.nominalFrameRate
    print("📹 Video duration: \(CMTimeGetSeconds(duration))s")
    print("📹 Video frame rate: \(frameRate) FPS")

    // Create simple composition without complex transforms
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

    // Preserve original video transform
    compositionVideoTrack.preferredTransform = videoTrack.preferredTransform

    // Add audio track if available
    let audioTracks = asset.tracks(withMediaType: .audio)
    if let audioTrack = audioTracks.first {
      if let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
      ) {
        try? compositionAudioTrack.insertTimeRange(
          CMTimeRange(start: .zero, duration: duration),
          of: audioTrack,
          at: .zero
        )
      }
    }

    // Create simple video composition for watermark only
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = videoTrack.naturalSize

    // CRITICAL FIX: Use source video's frame rate instead of hardcoding 30 FPS
    // This prevents black screen issues
    if frameRate > 0 && frameRate <= 120 {
      videoComposition.frameDuration = CMTime(value: 1, timescale: Int32(frameRate))
      print("   - Using source frame rate: \(frameRate) FPS")
    } else {
      videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
      print("   - Using default frame rate: 30 FPS (source was invalid: \(frameRate))")
    }

    videoComposition.renderScale = 1.0

    // Create instruction
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: duration)

    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)

    // CRITICAL FIX: Do NOT apply transform when using postProcessingAsVideoLayer
    // The transform is already handled by the composition track's preferredTransform
    // Applying it again causes double-transformation and black video
    print("   - NOT applying transform to layer instruction (handled by composition track)")
    // layerInstruction.setTransform(videoTrack.preferredTransform, at: .zero) // ❌ REMOVED

    instruction.layerInstructions = [layerInstruction]

    // Create layers for animation tool
    print("🏷️ Setting up video layers...")
    let parentLayer = CALayer()
    let videoLayer = CALayer()
    let watermarkLayer = CALayer()

    let videoSize = videoTrack.naturalSize
    parentLayer.frame = CGRect(origin: .zero, size: videoSize)
    videoLayer.frame = CGRect(origin: .zero, size: videoSize)
    watermarkLayer.frame = CGRect(origin: .zero, size: videoSize)

    // CRITICAL: Do NOT add videoLayer to parentLayer as a sublayer
    // When using postProcessingAsVideoLayer, AVFoundation automatically renders
    // video frames into videoLayer and composites it with parentLayer
    // Only add overlay layers (watermark) to parentLayer
    print("   - videoLayer will be used by animation tool (not added as sublayer)")

    // Add watermark if provided
    if watermarkImagePath != nil || watermarkText != nil {
      print("🏷️ Adding watermark...")

      // Add watermark content to watermark layer
      if let imagePath = watermarkImagePath {
        // Add image watermark
        let watermarkImage = UIImage(contentsOfFile: imagePath)
        if let image = watermarkImage {
          let imageLayer = CALayer()
          let imageSize = CGSize(width: 120, height: 40)
          imageLayer.frame = CGRect(
            x: videoSize.width - imageSize.width - 20,
            y: videoSize.height - imageSize.height - 20,
            width: imageSize.width,
            height: imageSize.height
          )
          imageLayer.contents = image.cgImage
          imageLayer.opacity = 0.8
          watermarkLayer.addSublayer(imageLayer)
        }
      }

      if let text = watermarkText {
        // Add text watermark
        let textLayer = CATextLayer()
        textLayer.string = text
        textLayer.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        textLayer.fontSize = 16
        textLayer.foregroundColor = UIColor.white.withAlphaComponent(0.8).cgColor
        textLayer.backgroundColor = UIColor.black.withAlphaComponent(0.5).cgColor
        textLayer.alignmentMode = .center
        textLayer.frame = CGRect(
          x: 20,
          y: videoSize.height - 60,
          width: 200,
          height: 40
        )
        textLayer.cornerRadius = 8
        watermarkLayer.addSublayer(textLayer)
      }

      // Add watermark layer to parent (video frames will be rendered behind this)
      parentLayer.addSublayer(watermarkLayer)
    }

    // Create animation tool - this tells AVFoundation to:
    // 1. Render video frames into videoLayer automatically
    // 2. Composite parentLayer (with overlays) ON TOP of the video
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )

    videoComposition.instructions = [instruction]

    // Export video
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

    print("🎬 Starting simplified export...")
    let semaphore = DispatchSemaphore(value: 0)
    var exportError: Error?

    exportSession.exportAsynchronously {
      if exportSession.status == .completed {
        print("✅ Simplified export completed successfully")
      } else {
        exportError = exportSession.error
        print("❌ Simplified export failed: \(exportSession.status.rawValue)")
      }
      semaphore.signal()
    }

    semaphore.wait()

    if let error = exportError {
      throw NSError(domain: "CaptionBurner", code: 4, userInfo: [
        NSLocalizedDescriptionKey: "Simplified export failed: \(error.localizedDescription)",
        NSUnderlyingErrorKey: error
      ])
    }

    // Verify output file
    if !fileManager.fileExists(atPath: outputURL.path) {
      throw NSError(domain: "CaptionBurner", code: 5, userInfo: [NSLocalizedDescriptionKey: "Output file was not created"])
    }

    print("✅ Simplified watermark processing complete! Output: \(outputURL.path)")
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

    print("🎨 Creating video composition...")
    print("   - Input video size: \(videoSize)")
    print("   - Transform: \(transform)")

    // Calculate the correct render size based on the transform
    // For rotated videos (90° or 270°), we need to swap width and height
    var normalizedSize = videoSize

    // Check if video is rotated (portrait mode)
    // A rotation transform has .b or .c values set (not zero)
    let isRotated = abs(transform.b) > 0.01 || abs(transform.c) > 0.01

    if isRotated {
      // Video is rotated, swap dimensions for render size
      normalizedSize = CGSize(width: videoSize.height, height: videoSize.width)
      print("   - Video is rotated, swapping dimensions: \(normalizedSize)")
    } else {
      print("   - Video is not rotated, using original size: \(normalizedSize)")
    }

    // CRITICAL: Validate render size is valid
    if normalizedSize.width <= 0 || normalizedSize.height <= 0 {
      throw NSError(domain: "CaptionBurner", code: 6, userInfo: [
        NSLocalizedDescriptionKey: "Invalid render size: \(normalizedSize). Video dimensions must be positive."
      ])
    }

    if normalizedSize.width > 10000 || normalizedSize.height > 10000 {
      throw NSError(domain: "CaptionBurner", code: 6, userInfo: [
        NSLocalizedDescriptionKey: "Render size too large: \(normalizedSize). Maximum dimension is 10000 pixels."
      ])
    }

    // Create video composition
    let videoComposition = AVMutableVideoComposition()

    // CRITICAL FIX: Use source video's frame rate instead of hardcoding 30 FPS
    // This prevents black screen issues
    if sourceFrameRate > 0 && sourceFrameRate <= 120 {
      videoComposition.frameDuration = CMTime(value: 1, timescale: Int32(sourceFrameRate))
      print("   - Using source frame rate: \(sourceFrameRate) FPS")
    } else {
      videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
      print("   - Using default frame rate: 30 FPS (source was invalid: \(sourceFrameRate))")
    }

    videoComposition.renderSize = normalizedSize
    videoComposition.renderScale = 1.0  // Ensure 1:1 pixel rendering
    print("✅ Video composition configuration set")
    print("   - Render size: \(normalizedSize)")
    print("   - Render scale: 1.0")

    // Create layers
    let parentLayer = CALayer()
    let videoLayer = CALayer()
    let captionLayer = CALayer()
    let watermarkLayer = CALayer()

    // All layers use the same size - the final render size (after rotation)
    print("🎨 Configuring layer frames:")
    print("   - All layers: \(normalizedSize)")

    parentLayer.frame = CGRect(origin: .zero, size: normalizedSize)
    videoLayer.frame = CGRect(origin: .zero, size: normalizedSize)
    captionLayer.frame = CGRect(origin: .zero, size: normalizedSize)
    watermarkLayer.frame = CGRect(origin: .zero, size: normalizedSize)

    // CRITICAL: The video frames are rendered automatically by AVFoundation
    // We only add the OVERLAY layers (watermark and captions) to parentLayer
    // The videoLayer is used ONLY for the animation tool, not added as sublayer

    // Add watermark layer
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

    // Create animation tool with postProcessingAsVideoLayer
    // This tells AVFoundation to:
    // 1. Render the video frames into videoLayer automatically
    // 2. Composite parentLayer (with overlays) ON TOP of the video
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

    // CRITICAL FIX: We MUST set the transform on the layer instruction
    // This ensures the video frames are properly oriented in the composition
    // Without this, the video appears black or incorrectly oriented
    print("   - Applying transform to layer instruction: \(transform)")
    layerInstruction.setTransform(transform, at: .zero)

    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    print("✅ Video composition instructions configured")

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

