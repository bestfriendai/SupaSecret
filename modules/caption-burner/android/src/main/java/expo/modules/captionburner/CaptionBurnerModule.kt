package expo.modules.captionburner

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class CaptionBurnerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CaptionBurnerModule")

    // Async function to burn captions into video
    AsyncFunction("burnCaptionsIntoVideo") { inputPath: String, captionSegmentsJSON: String, promise: Promise ->
      // TODO: Implement Android caption burning
      // Requires MediaCodec for decode/encode + Canvas/Paint for text rendering
      // Estimated: 3-4 days for production quality
      promise.reject(
        "NOT_IMPLEMENTED",
        "Android caption burning requires MediaCodec integration (3-4 days work). Use iOS for now or implement server-side caption burning.",
        null
      )
    }

    // Function to check if caption burning is available
    Function("isAvailable") {
      false // Not yet implemented on Android
    }
  }
}

