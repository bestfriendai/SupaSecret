/**
 * Lightweight structured logger used across the app.
 * Centralizes logging so we can later forward logs to an external service.
 * Enhanced with dev-only logging to reduce production noise
 */
export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) console.log("[LOG]", ...args);
  },
  info: (...args: any[]) => {
    if (__DEV__) console.info("[INFO]", ...args);
  },
  warn: (...args: any[]) => {
    if (__DEV__) console.warn("[WARN]", ...args);
  },
  error: (...args: any[]) => {
    // Keep errors in production for crash reporting
    console.error("[ERROR]", ...args);
  },
  debug: (...args: any[]) => {
    if (__DEV__) console.debug("[DEBUG]", ...args);
  },
  group: (label: string) => {
    if (__DEV__) console.group(label);
  },
  groupEnd: () => {
    if (__DEV__) console.groupEnd();
  },
  table: (data: any) => {
    if (__DEV__) console.table(data);
  },
  time: (label: string) => {
    if (__DEV__) console.time(label);
  },
  timeEnd: (label: string) => {
    if (__DEV__) console.timeEnd(label);
  },
};

export default logger;
