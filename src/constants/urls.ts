/**
 * URL constants for external links
 */

// Base URLs from environment or defaults
const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (envUrl && !envUrl.includes('PLACEHOLDER') && !envUrl.includes('example.com')) {
    return envUrl;
  }
  return "https://toxicconfessions.app";
};

const getFallbackUrl = (): string => {
  const envFallbackUrl = process.env.EXPO_PUBLIC_FALLBACK_URL;
  if (envFallbackUrl && !envFallbackUrl.includes('PLACEHOLDER') && !envFallbackUrl.includes('example.com')) {
    return envFallbackUrl;
  }
  return "https://toxicconfessions.com";
};

const getSupportEmail = (): string => {
  const envEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
  if (envEmail && !envEmail.includes('PLACEHOLDER') && !envEmail.includes('example.com')) {
    return envEmail;
  }
  return "support@toxicconfessions.com";
};

export const URLS = {
  PRIVACY_POLICY: `${getBaseUrl()}/privacy`,
  TERMS_OF_SERVICE: `${getBaseUrl()}/terms`,
  HELP_SUPPORT: `${getBaseUrl()}/help`,
  CONTACT_US: `${getBaseUrl()}/contact`,

  // Fallback URLs if the main ones are not available
  FALLBACK_PRIVACY_POLICY: `${getFallbackUrl()}/privacy`,
  FALLBACK_TERMS_OF_SERVICE: `${getFallbackUrl()}/terms`,
  FALLBACK_HELP_SUPPORT: `mailto:${getSupportEmail()}`,
} as const;

/**
 * Get the appropriate URL with fallback logic
 */
export const getPrivacyPolicyUrl = async (): Promise<string> => {
  try {
    // In a real implementation, you might want to check if the primary URL is accessible
    return URLS.PRIVACY_POLICY;
  } catch (error) {
    console.warn('Primary privacy policy URL not accessible, using fallback');
    return URLS.FALLBACK_PRIVACY_POLICY;
  }
};

export const getTermsOfServiceUrl = async (): Promise<string> => {
  try {
    return URLS.TERMS_OF_SERVICE;
  } catch (error) {
    console.warn('Primary terms of service URL not accessible, using fallback');
    return URLS.FALLBACK_TERMS_OF_SERVICE;
  }
};

export const getHelpSupportUrl = async (): Promise<string> => {
  try {
    return URLS.HELP_SUPPORT;
  } catch (error) {
    console.warn('Primary help support URL not accessible, using fallback');
    return URLS.FALLBACK_HELP_SUPPORT;
  }
};

// Synchronous versions for immediate use
export const getPrivacyPolicyUrlSync = (): string => URLS.PRIVACY_POLICY;
export const getTermsOfServiceUrlSync = (): string => URLS.TERMS_OF_SERVICE;
export const getHelpSupportUrlSync = (): string => URLS.HELP_SUPPORT;

// Direct URL exports for convenience
export const PRIVACY_POLICY_URL = URLS.PRIVACY_POLICY;
export const TERMS_OF_SERVICE_URL = URLS.TERMS_OF_SERVICE;
export const HELP_SUPPORT_URL = URLS.HELP_SUPPORT;
export const CONTACT_US_URL = URLS.CONTACT_US;

// Validation function to ensure URLs are properly configured
export const validateUrls = (): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check for placeholder patterns
  const placeholderPatterns = ['example.com', 'placeholder', 'your-domain', 'localhost'];

  Object.entries(URLS).forEach(([key, url]) => {
    if (typeof url === 'string') {
      // Check for placeholder patterns
      const hasPlaceholder = placeholderPatterns.some(pattern =>
        url.toLowerCase().includes(pattern)
      );

      if (hasPlaceholder) {
        issues.push(`${key} contains placeholder URL: ${url}`);
      }

      // Check for valid URL format (basic check)
      try {
        new URL(url);
      } catch (error) {
        if (!url.startsWith('mailto:')) {
          issues.push(`${key} has invalid URL format: ${url}`);
        }
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
};

// Initialize and validate URLs
export const initializeUrls = (): void => {
  const validation = validateUrls();

  if (!validation.isValid) {
    console.warn('⚠️ URL configuration issues found:');
    validation.issues.forEach(issue => {
      console.warn(`  - ${issue}`);
    });

    if (!__DEV__) {
      console.error('❌ Invalid URL configuration in production');
    }
  } else {
    console.log('✅ URL configuration validated successfully');
  }
};
