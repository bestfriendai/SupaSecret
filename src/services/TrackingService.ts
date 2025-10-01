/**
 * App Tracking Transparency Service
 * Handles iOS ATT (App Tracking Transparency) requirement for App Store approval
 *
 * CRITICAL for App Store approval - iOS 14.5+ requires user permission before tracking
 */

import { Platform } from "react-native";
import Constants from "expo-constants";

// Type for tracking status
export type TrackingStatus = "authorized" | "denied" | "restricted" | "notDetermined" | "unavailable";

export interface TrackingResult {
  status: TrackingStatus;
  canTrack: boolean;
}

class TrackingService {
  private static instance: TrackingService;
  private permissionStatus: TrackingStatus = "notDetermined";
  private hasRequested: boolean = false;

  private constructor() {}

  static getInstance(): TrackingService {
    if (!TrackingService.instance) {
      TrackingService.instance = new TrackingService();
    }
    return TrackingService.instance;
  }

  /**
   * Check if tracking is available on this platform
   */
  isAvailable(): boolean {
    // ATT only required on iOS 14.5+
    return Platform.OS === "ios" && parseInt(Platform.Version as string, 10) >= 14;
  }

  /**
   * Get current tracking authorization status
   */
  async getTrackingStatus(): Promise<TrackingResult> {
    if (!this.isAvailable()) {
      return { status: "unavailable", canTrack: true };
    }

    try {
      // Dynamic import for iOS-only module
      const { getTrackingStatus } = await import("react-native-tracking-transparency");
      const status = await getTrackingStatus();

      this.permissionStatus = status as TrackingStatus;

      return {
        status: this.permissionStatus,
        canTrack: this.permissionStatus === "authorized",
      };
    } catch (error) {
      console.warn("Failed to get tracking status:", error);
      // Fallback: assume can't track if library unavailable
      return { status: "unavailable", canTrack: false };
    }
  }

  /**
   * Request tracking permission from user
   * Shows the iOS system dialog with the message from Info.plist
   */
  async requestTrackingPermission(): Promise<TrackingResult> {
    if (!this.isAvailable()) {
      return { status: "unavailable", canTrack: true };
    }

    // Only request once per app session
    if (this.hasRequested) {
      return this.getTrackingStatus();
    }

    try {
      const { requestTrackingPermission } = await import("react-native-tracking-transparency");
      const status = await requestTrackingPermission();

      this.permissionStatus = status as TrackingStatus;
      this.hasRequested = true;

      console.log("ATT Permission Status:", status);

      return {
        status: this.permissionStatus,
        canTrack: this.permissionStatus === "authorized",
      };
    } catch (error) {
      console.error("Failed to request tracking permission:", error);
      return { status: "unavailable", canTrack: false };
    }
  }

  /**
   * Check if we should show the tracking request dialog
   * Only show if status is 'notDetermined'
   */
  async shouldRequestPermission(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    const { status } = await this.getTrackingStatus();
    return status === "notDetermined" && !this.hasRequested;
  }

  /**
   * Get user-friendly status description
   */
  getStatusDescription(status: TrackingStatus): string {
    switch (status) {
      case "authorized":
        return "Tracking authorized - showing personalized ads";
      case "denied":
        return "Tracking denied - showing non-personalized ads";
      case "restricted":
        return "Tracking restricted by system - showing non-personalized ads";
      case "notDetermined":
        return "Tracking permission not yet requested";
      case "unavailable":
        return "Tracking not available on this device";
      default:
        return "Unknown tracking status";
    }
  }

  /**
   * Reset permission state (for testing only)
   */
  reset(): void {
    this.hasRequested = false;
    this.permissionStatus = "notDetermined";
  }
}

// Export singleton instance
export const trackingService = TrackingService.getInstance();

// Export class for testing
export { TrackingService };
