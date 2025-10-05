import AsyncStorage from "@react-native-async-storage/async-storage";
import { errorReporting } from "../services/ErrorReportingService";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  tags?: string[];
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;
  private readonly storageKey = "@app_logs";
  private minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateId();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as LogEntry[];
        this.logs = parsed.slice(-this.maxLogs);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, tags?: string[]): LogEntry {
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      sessionId: this.sessionId,
      tags,
    };
  }

  private async log(level: LogLevel, message: string, context?: Record<string, any>, tags?: string[]): Promise<void> {
    if (level < this.minLevel) return;

    const entry = this.createLogEntry(level, message, context, tags);

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to storage for ERROR and CRITICAL levels
    if (level >= LogLevel.ERROR) {
      await this.persistLogs();
    }

    // Console output
    const levelName = LogLevel[level];
    const consoleMethod =
      level >= LogLevel.ERROR ? "error" : level >= LogLevel.WARN ? "warn" : level >= LogLevel.INFO ? "info" : "debug";

    console[consoleMethod](`[${levelName}] ${message}`, context || "");

    // Report errors to error reporting service
    if (level >= LogLevel.ERROR) {
      errorReporting.reportError(new Error(message), {
        severity: level === LogLevel.CRITICAL ? "critical" : "high",
        tags: ["logged_error", ...(tags || [])],
        action: "log_error",
      });
    }
  }

  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, message, context, tags);
  }

  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, message, context, tags);
  }

  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, message, context, tags);
  }

  error(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.ERROR, message, context, tags);
  }

  critical(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.CRITICAL, message, context, tags);
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string, context?: Record<string, any>): void {
    console.timeEnd(label);
    this.debug(`Timer ended: ${label}`, context, ["performance"]);
  }

  // User action logging
  userAction(action: string, context?: Record<string, any>): void {
    this.info(`User action: ${action}`, context, ["user_action"]);
  }

  // API logging
  apiCall(endpoint: string, method: string, duration?: number, context?: Record<string, any>): void {
    const message = `API ${method} ${endpoint}${duration ? ` (${duration}ms)` : ""}`;
    this.info(message, context, ["api"]);
  }

  apiError(endpoint: string, method: string, error: any, context?: Record<string, any>): void {
    const message = `API Error ${method} ${endpoint}: ${error?.message || "Unknown error"}`;
    this.error(message, { ...context, error }, ["api", "error"]);
  }

  // Navigation logging
  navigation(from: string, to: string, context?: Record<string, any>): void {
    this.info(`Navigation: ${from} -> ${to}`, context, ["navigation"]);
  }

  // Error boundary logging
  errorBoundary(error: Error, componentStack?: string, context?: Record<string, any>): void {
    this.critical(
      "React Error Boundary triggered",
      {
        ...context,
        error: error.message,
        stack: error.stack,
        componentStack,
      },
      ["error_boundary", "crash"],
    );
  }

  private async persistLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error("Failed to persist logs:", error);
    }
  }

  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = level !== undefined ? this.logs.filter((log) => log.level >= level) : this.logs;
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
    AsyncStorage.removeItem(this.storageKey).catch(console.error);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Flush logs to remote service (for production)
  async flushLogs(): Promise<void> {
    // TODO: Implement remote log shipping
    if (!__DEV__) {
      console.log("Would flush logs to remote service");
    }
  }
}

export const logger = Logger.getInstance();

// Convenience functions
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  critical: logger.critical.bind(logger),
  time: logger.time.bind(logger),
  timeEnd: logger.timeEnd.bind(logger),
  userAction: logger.userAction.bind(logger),
  apiCall: logger.apiCall.bind(logger),
  apiError: logger.apiError.bind(logger),
  navigation: logger.navigation.bind(logger),
  errorBoundary: logger.errorBoundary.bind(logger),
};
