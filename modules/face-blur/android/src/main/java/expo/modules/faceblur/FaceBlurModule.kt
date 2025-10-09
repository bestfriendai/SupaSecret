package expo.modules.faceblur

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FaceBlurModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FaceBlurModule")

    // Async function to blur faces in a video
    AsyncFunction("blurFacesInVideo") { inputPath: String, blurIntensity: Int, promise: Promise ->
      // TODO: Implement Android video processing
      // Requires MediaCodec for decode/encode + ML Kit for face detection
      // Estimated: 2-3 days for production quality
      promise.reject(
        "NOT_IMPLEMENTED",
        "Android video blur requires MediaCodec integration (2-3 days work). Use iOS for now or implement server-side blur.",
        null
      )
    }

    // Function to check if face blur is available
    Function("isAvailable") {
      false // Not yet implemented on Android
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is null")
}
