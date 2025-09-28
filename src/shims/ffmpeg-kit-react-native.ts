/**
 * Lightweight shim for ffmpeg-kit-react-native when native binaries are unavailable.
 * This lets Metro bundle the project (e.g. Expo Go or CI) without the heavy native module.
 * Any invocation still fails fast so native processing features can fall back gracefully.
 */

const unavailableMessage =
  "ffmpeg-kit-react-native is not available in the current environment. Install the native module or run a dev build.";

const rejectUnavailable = async () => {
  throw new Error(unavailableMessage);
};

const noop = () => {};

export const FFmpegKit = {
  execute: async () => rejectUnavailable(),
  executeAsync: async () => rejectUnavailable(),
  executeWithArguments: async () => rejectUnavailable(),
  cancel: noop,
  cancelExecution: noop,
};

export const FFprobeKit = {
  getMediaInformation: async () => rejectUnavailable(),
};

export const ReturnCode = {
  isSuccess: () => false,
  isCancel: () => false,
  isError: () => true,
  value: () => -1,
};

export const FFmpegKitConfig = {
  enableLogs: noop,
  disableLogs: noop,
  setFontDirectory: noop,
  setFontDirectoryList: noop,
  setLogLevel: noop,
  enableStatisticsCallback: noop,
};

export default {
  FFmpegKit,
  FFprobeKit,
  ReturnCode,
  FFmpegKitConfig,
};
