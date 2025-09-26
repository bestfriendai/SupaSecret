/**
 * Calculate ad frequency based on placement
 * @param placement - The placement type for the ad
 * @returns The frequency interval (0 means no ads)
 */
export function calculateAdFrequency(placement: string): number {
  switch (placement) {
    case "video-feed":
      return 0; // No ads in video feed
    case "home-feed":
      return 10; // Show ads every 10 items
    case "trending":
      return 8; // Show ads every 8 items
    default:
      return 0; // No ads by default
  }
}
