/**
 * Hermes Polyfill for compatibility
 * Ensures dynamic imports work properly in Hermes runtime
 */

if (typeof global !== "undefined") {
  // Store original import for fallback if needed
  const originalImport = (global as any).import;

  // Override global import with Hermes-safe async version
  (global as any).import = async function (specifier: string) {
    try {
      if (originalImport && typeof originalImport === "function") {
        return await originalImport.call(this, specifier);
      }
      // Fallback to native dynamic import
      return await import(specifier);
    } catch (error) {
      console.warn(`Dynamic import failed for ${specifier}:`, error);
      throw error;
    }
  };
}

export {};
