import Constants from "expo-constants";

const ownership = Constants.appOwnership as unknown as "expo" | "standalone" | null;

export const env = {
  expoGo: ownership === "expo",
  devClient: ownership === null,
  standalone: ownership === "standalone",
  get ffmpegReady(): boolean {
    return !!(global as any).__ffmpegAvailable;
  },
  get isNativeCapable(): boolean {
    return !this.expoGo;
  },
};

export const isExpoGo = () => env.expoGo;
export const canUseNativeFeatures = () => env.isNativeCapable;
