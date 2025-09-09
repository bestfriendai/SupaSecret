import Constants from "expo-constants";

export const env = {
  expoGo: Constants.appOwnership === "expo",
  devClient: Constants.appOwnership === null || Constants.appOwnership === "development",
  standalone: Constants.appOwnership === "standalone",
  get ffmpegReady(): boolean {
    return !!(global as any).__ffmpegAvailable;
  },
  get isNativeCapable(): boolean {
    return !this.expoGo;
  },
};

export const isExpoGo = () => env.expoGo;
export const canUseNativeFeatures = () => env.isNativeCapable;
