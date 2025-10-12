/**
 * Tests for PostProcessBlurService
 */

import {
  applyPostProcessBlur,
  isPostProcessBlurAvailable,
  getBlurProcessingMethod,
  estimateProcessingTime,
} from "../PostProcessBlurService";

// Mock dependencies
jest.mock("../../utils/environmentCheck", () => ({
  IS_EXPO_GO: false,
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
}));

describe("PostProcessBlurService", () => {
  describe("isPostProcessBlurAvailable", () => {
    it("should always return true", async () => {
      const available = await isPostProcessBlurAvailable();
      expect(available).toBe(true);
    });
  });

  describe("getBlurProcessingMethod", () => {
    it("should return server-side for native builds", () => {
      const method = getBlurProcessingMethod();
      expect(method).toBe("server-side");
    });
  });

  describe("estimateProcessingTime", () => {
    it("should estimate processing time correctly", () => {
      const time = estimateProcessingTime(10);
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(30); // Max 3x video duration
    });

    it("should scale with video duration", () => {
      const time1 = estimateProcessingTime(10);
      const time2 = estimateProcessingTime(20);
      expect(time2).toBeGreaterThan(time1);
    });
  });

  describe("applyPostProcessBlur", () => {
    it("should handle missing video file", async () => {
      const FileSystem = require("expo-file-system/legacy");
      FileSystem.getInfoAsync.mockResolvedValue({ exists: false });

      const result = await applyPostProcessBlur("file:///test.mp4");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle valid video file", async () => {
      const FileSystem = require("expo-file-system/legacy");
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true });

      const result = await applyPostProcessBlur("file:///test.mp4");

      expect(result.success).toBe(true);
      expect(result.processedVideoUri).toBe("file:///test.mp4");
    });

    it("should call progress callback", async () => {
      const FileSystem = require("expo-file-system/legacy");
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true });

      const onProgress = jest.fn();
      await applyPostProcessBlur("file:///test.mp4", { onProgress });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(expect.any(Number), expect.any(String));
    });

    it("should respect blur intensity option", async () => {
      const FileSystem = require("expo-file-system/legacy");
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true });

      const result = await applyPostProcessBlur("file:///test.mp4", {
        blurIntensity: 50,
      });

      expect(result.success).toBe(true);
    });
  });
});
