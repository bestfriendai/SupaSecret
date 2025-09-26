/**
 * Lightweight structured logger used across the app.
 * Centralizes logging so we can later forward logs to an external service.
 */
export const logger = {
  info: (...args: any[]) => {
    console.info("[INFO]", ...args);
  },
  warn: (...args: any[]) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args: any[]) => {
    // Keep error structured and easy to replace with an external sink
    console.error("[ERROR]", ...args);
  },
  debug: (...args: any[]) => {
    if (__DEV__) console.debug("[DEBUG]", ...args);
  },
};

export default logger;
