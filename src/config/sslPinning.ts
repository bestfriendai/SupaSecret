// SSL Pinning configuration placeholder
// Package react-native-ssl-pinning is not installed
// To enable SSL pinning:
// 1. Install: npm install react-native-ssl-pinning
// 2. Get certificate hash: openssl s_client -connect xhtqobjcbjgzxkgfyvdj.supabase.co:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
// 3. Add hash to certificateHashes array below

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
  // SSL Pinning currently disabled - package not installed
  // Uncomment below when react-native-ssl-pinning is installed

  /*
  const RNSSLPinning = require("react-native-ssl-pinning");
  const sslModule = RNSSLPinning as unknown as SSLPinningModule;
  
  if (typeof sslModule.addSSLPinningHosts !== "function") {
    if (__DEV__) {
      console.warn(
        "configureSSLPinning(): addSSLPinningHosts not available in current react-native-ssl-pinning version; skipping dynamic host configuration",
      );
    }
    return;
  }

  const certificateHashes: string[] = [
    // Add your Supabase SSL certificate hash here
    // Example: "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
  ];

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
  */

  if (__DEV__) {
    console.log("SSL Pinning is currently disabled. Install react-native-ssl-pinning to enable.");
  }
};
