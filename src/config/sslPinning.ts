import * as RNSSLPinning from "react-native-ssl-pinning";

type SSLPinningModule = {
  addSSLPinningHosts?: (
    hosts: {
      host: string;
      includeSubdomains?: boolean;
      certificateHashes: string[];
    }[],
  ) => void;
};

// Certificate pinning configuration for enhanced security
export const configureSSLPinning = () => {
  const sslModule = RNSSLPinning as unknown as SSLPinningModule;
  if (typeof sslModule.addSSLPinningHosts !== "function") {
    if (__DEV__) {
      console.warn(
        "configureSSLPinning(): addSSLPinningHosts not available in current react-native-ssl-pinning version; skipping dynamic host configuration",
      );
    }
    return;
  }

  const certificateHashes: string[] = [];

  if (certificateHashes.length === 0) {
    if (__DEV__) {
      console.warn("configureSSLPinning(): no certificate hashes configured; skipping SSL pinning setup");
    }
    return;
  }

  sslModule.addSSLPinningHosts([
    {
      host: "xhtqobjcbjgzxkgfyvdj.supabase.co",
      includeSubdomains: false,
      certificateHashes,
    },
  ]);
};
