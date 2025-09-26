import { useState, useEffect } from "react";
import Constants from "expo-constants";

declare const __DEV__: boolean;

export type BuildMode = "expo-go" | "development" | "production" | "preview";

export interface BuildModeInfo {
  mode: BuildMode;
  isExpoGo: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  isPreview: boolean;
}

export function useBuildMode(): BuildModeInfo {
  const [buildMode, setBuildMode] = useState<BuildModeInfo>({
    mode: "development",
    isExpoGo: false,
    isDevelopment: false,
    isProduction: false,
    isPreview: false,
  });

  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === "storeClient";
    const isDevelopment = __DEV__ && !isExpoGo;
    const isProduction = !__DEV__ && !isExpoGo;
    const isPreview =
      !__DEV__ &&
      !isExpoGo &&
      (Constants.executionEnvironment === "standalone" || Constants.executionEnvironment === undefined);

    let mode: BuildMode = "development";
    if (isExpoGo) mode = "expo-go";
    else if (isProduction) mode = "production";
    else if (isPreview) mode = "preview";

    const modeInfo: BuildModeInfo = {
      mode,
      isExpoGo,
      isDevelopment,
      isProduction,
      isPreview,
    };

    console.log("[BuildMode] Current build mode:", modeInfo);
    setBuildMode(modeInfo);
  }, []);

  return buildMode;
}
