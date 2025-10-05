/**
 * Type declarations for native VisionCamera frame processor plugins
 */

interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  blurRadius?: number;
}

declare global {
  /**
   * Native frame processor plugin for blurring faces
   * Uses iOS Core Image (CIGaussianBlur) for high-performance blur
   *
   * @param frame - The camera frame to process
   * @param faces - Array of face regions to blur
   */
  function blurFaces(frame: any, faces: FaceRegion[]): void;
}

export {};
