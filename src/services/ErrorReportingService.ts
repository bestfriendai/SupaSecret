import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context: {
    userId?: string;
    screen?: string;
    action?: string;
    networkStatus?: boolean;
    appVersion: string;
    buildVersion: string;
    deviceInfo: {
      modelName: string;
      osName: string;
      osVersion: string;
      deviceType: string;
    };
    platform: string;
  };
  severity: "low" | "medium" | "high" | "critical";
  tags: string[];
}

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private errorQueue: ErrorReport[] = [];
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly STORAGE_KEY = "@error_reports";
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load persisted errors
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ErrorReport[];
        this.errorQueue = parsed.slice(-this.MAX_QUEUE_SIZE); // Keep only recent ones
      }
    } catch (error) {
      console.error("Failed to load error reports:", error);
    }

    this.isInitialized = true;
  }

  async reportError(
    error: Error | unknown,
    context: {
      userId?: string;
      screen?: string;
      action?: string;
      networkStatus?: boolean;
      severity?: "low" | "medium" | "high" | "critical";
      tags?: string[];
    } = {},
  ): Promise<void> {
    try {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      const report: ErrorReport = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
        error: {
          message: errorObj.message,
          stack: errorObj.stack,
          name: errorObj.name,
        },
        context: {
          userId: context.userId,
          screen: context.screen,
          action: context.action,
          networkStatus: context.networkStatus,
          appVersion: Application.nativeApplicationVersion || "unknown",
          buildVersion: Application.nativeBuildVersion || "unknown",
          deviceInfo: {
            modelName: Device.modelName || "unknown",
            osName: Device.osName || "unknown",
            osVersion: Device.osVersion || "unknown",
            deviceType: Device.deviceType?.toString() || "unknown",
          },
          platform: Platform.OS,
        },
        severity: context.severity || "medium",
        tags: context.tags || [],
      };

      // Add to queue
      this.errorQueue.push(report);

      // Keep queue size manageable
      if (this.errorQueue.length > this.MAX_QUEUE_SIZE) {
        this.errorQueue = this.errorQueue.slice(-this.MAX_QUEUE_SIZE);
      }

      // Persist immediately for critical errors
      if (report.severity === "critical" || report.severity === "high") {
        await this.persistReports();
      } else {
        // Debounce persistence for lower severity errors
        this.debouncedPersist();
      }

      // Log to console in development
      if (__DEV__) {
        console.group(`🚨 Error Report (${report.severity.toUpperCase()})`);
        console.error("Error:", errorObj);
        console.log("Context:", context);
        console.log("Report ID:", report.id);
        console.groupEnd();
      }

      // Send to remote service (when online)
      this.sendToRemote(report);
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  }

  private async sendToRemote(report: ErrorReport): Promise<void> {
    // TODO: Implement remote error reporting
    // For now, just log in production
    if (!__DEV__) {
      console.log("Error report would be sent to remote service:", report.id);
    }
  }

  private debouncedPersist = this.debounce(async () => {
    await this.persistReports();
  }, 5000);

  private debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  private async persistReports(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.errorQueue));
    } catch (error) {
      console.error("Failed to persist error reports:", error);
    }
  }

  async flushReports(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    try {
      // Send all reports to remote service
      for (const report of this.errorQueue) {
        await this.sendToRemote(report);
      }

      // Clear queue after successful send
      this.errorQueue = [];
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("Failed to flush error reports:", error);
    }
  }

  getReports(): ErrorReport[] {
    return [...this.errorQueue];
  }

  clearReports(): void {
    this.errorQueue = [];
    AsyncStorage.removeItem(this.STORAGE_KEY).catch(console.error);
  }

  // Utility method for React Error Boundaries
  captureException(error: Error, context?: Record<string, any>): void {
    this.reportError(error, {
      severity: "high",
      tags: ["react_error_boundary"],
      ...context,
    });
  }
}

export const errorReporting = ErrorReportingService.getInstance();
