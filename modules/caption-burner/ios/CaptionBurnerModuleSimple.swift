import Foundation
import AVFoundation
import CoreImage
import UIKit

// SIMPLIFIED VERSION - Just copy video and add text overlays without complex layer composition
@objc(CaptionBurnerModuleSimple)
class CaptionBurnerModuleSimple: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func testSimpleCopy(
    _ inputPath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        print("🧪 TEST: Simple video copy without any processing")
        
        // Convert input path to URL
        let inputURL: URL
        if inputPath.hasPrefix("file://") {
          inputURL = URL(string: inputPath)!
        } else {
          inputURL = URL(fileURLWithPath: inputPath)
        }
        
        print("🧪 Input: \(inputURL.path)")
        
        // Check if file exists
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: inputURL.path) else {
          reject("FILE_NOT_FOUND", "Input video file not found", nil)
          return
        }
        
        // Get file size
        let attributes = try fileManager.attributesOfItem(atPath: inputURL.path)
        if let fileSize = attributes[FileAttributeKey.size] as? UInt64 {
          print("🧪 Input file size: \(Double(fileSize) / 1_000_000.0) MB")
        }
        
        // Load asset
        let asset = AVAsset(url: inputURL)
        let tracks = asset.tracks(withMediaType: .video)
        
        guard let videoTrack = tracks.first else {
          reject("NO_VIDEO_TRACK", "No video track found", nil)
          return
        }
        
        print("🧪 Video track found")
        print("🧪 Natural size: \(videoTrack.naturalSize)")
        print("🧪 Transform: \(videoTrack.preferredTransform)")
        
        // Create output URL
        let outputURL = FileManager.default.temporaryDirectory
          .appendingPathComponent("test_copy_\(UUID().uuidString).mov")
        
        // Simple export without any processing
        guard let exportSession = AVAssetExportSession(
          asset: asset,
          presetName: AVAssetExportPresetHighestQuality
        ) else {
          reject("EXPORT_SESSION_FAILED", "Could not create export session", nil)
          return
        }
        
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mov
        exportSession.shouldOptimizeForNetworkUse = true
        
        print("🧪 Starting simple export...")
        
        let semaphore = DispatchSemaphore(value: 0)
        var exportError: Error?
        
        exportSession.exportAsynchronously {
          if exportSession.status == .completed {
            print("🧪 ✅ Simple export completed successfully")
          } else {
            print("🧪 ❌ Simple export failed: \(exportSession.status.rawValue)")
            if let error = exportSession.error {
              print("🧪 ❌ Error: \(error.localizedDescription)")
              exportError = error
            }
          }
          semaphore.signal()
        }
        
        semaphore.wait()
        
        if let error = exportError {
          reject("EXPORT_FAILED", error.localizedDescription, error)
          return
        }
        
        // Check output file
        if fileManager.fileExists(atPath: outputURL.path) {
          let outputAttributes = try fileManager.attributesOfItem(atPath: outputURL.path)
          if let outputSize = outputAttributes[FileAttributeKey.size] as? UInt64 {
            print("🧪 ✅ Output file size: \(Double(outputSize) / 1_000_000.0) MB")
          }
        }
        
        resolve([
          "success": true,
          "outputPath": outputURL.path,
          "message": "Simple copy completed - if this works, the issue is in the layer composition"
        ])
        
      } catch {
        print("🧪 ❌ Test failed: \(error.localizedDescription)")
        reject("TEST_FAILED", error.localizedDescription, error)
      }
    }
  }
}

