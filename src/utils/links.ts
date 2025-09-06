import * as Linking from 'expo-linking';

/**
 * Centralized link generation utility for share flows and deep linking
 */

// Configuration for link generation
const LINK_CONFIG = {
  // Use app deep link for production, fallback to web URL for sharing
  appScheme: 'supasecret',
  webDomain: 'secrets.app',
  // You can configure this based on environment
  useDeepLinks: true,
};

/**
 * Generate a shareable link for a confession
 * @param confessionId - The ID of the confession to share
 * @param useAppLink - Whether to use app deep link or web URL (default: false for sharing)
 * @returns The shareable URL
 */
export function generateConfessionLink(confessionId: string, useAppLink: boolean = false): string {
  if (useAppLink && LINK_CONFIG.useDeepLinks) {
    // Generate app deep link using Expo Linking
    return Linking.createURL(`/confession/${confessionId}`);
  } else {
    // Generate web URL for sharing
    return `https://${LINK_CONFIG.webDomain}/confession/${confessionId}`;
  }
}

/**
 * Generate a shareable link for a trending hashtag
 * @param hashtag - The hashtag to share (without #)
 * @param useAppLink - Whether to use app deep link or web URL
 * @returns The shareable URL
 */
export function generateHashtagLink(hashtag: string, useAppLink: boolean = false): string {
  const cleanHashtag = hashtag.replace('#', '');
  
  if (useAppLink && LINK_CONFIG.useDeepLinks) {
    return Linking.createURL(`/trending?hashtag=${encodeURIComponent(cleanHashtag)}`);
  } else {
    return `https://${LINK_CONFIG.webDomain}/trending?hashtag=${encodeURIComponent(cleanHashtag)}`;
  }
}

/**
 * Generate a share message for a confession
 * @param confessionText - The confession text to include in the message
 * @param confessionId - The ID of the confession
 * @param maxTextLength - Maximum length of confession text to include (default: 100)
 * @returns The formatted share message
 */
export function generateShareMessage(
  confessionText: string, 
  confessionId: string, 
  maxTextLength: number = 100
): string {
  const shareUrl = generateConfessionLink(confessionId);
  const truncatedText = confessionText.length > maxTextLength 
    ? `${confessionText.substring(0, maxTextLength)}...` 
    : confessionText;
  
  return `Check out this anonymous confession: "${truncatedText}" ${shareUrl}`;
}

/**
 * Parse a deep link URL to extract route information
 * @param url - The deep link URL to parse
 * @returns Parsed route information or null if invalid
 */
export function parseDeepLink(url: string): { route: string; params: Record<string, string> } | null {
  try {
    const parsed = Linking.parse(url);
    
    if (!parsed.path) return null;
    
    // Handle confession links
    const confessionMatch = parsed.path.match(/^\/confession\/(.+)$/);
    if (confessionMatch) {
      return {
        route: 'SecretDetail',
        params: { confessionId: confessionMatch[1] }
      };
    }
    
    // Handle trending links
    const trendingMatch = parsed.path.match(/^\/trending$/);
    if (trendingMatch && parsed.queryParams?.hashtag) {
      return {
        route: 'Trending',
        params: { hashtag: parsed.queryParams.hashtag as string }
      };
    }
    
    return null;
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to parse deep link:', error);
    }
    return null;
  }
}

/**
 * Check if a URL is a valid app deep link
 * @param url - The URL to check
 * @returns Whether the URL is a valid app deep link
 */
export function isAppDeepLink(url: string): boolean {
  return url.startsWith(`${LINK_CONFIG.appScheme}://`);
}

/**
 * Update link configuration (useful for different environments)
 * @param config - Partial configuration to update
 */
export function updateLinkConfig(config: Partial<typeof LINK_CONFIG>): void {
  Object.assign(LINK_CONFIG, config);
}
