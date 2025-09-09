/**
 * URL constants for external links
 */

export const URLS = {
  PRIVACY_POLICY: "https://supasecret.app/privacy",
  TERMS_OF_SERVICE: "https://supasecret.app/terms",
  HELP_SUPPORT: "https://supasecret.app/help",
  CONTACT_US: "https://supasecret.app/contact",

  // Fallback URLs if the main ones are not available
  FALLBACK_PRIVACY_POLICY: "https://www.privacypolicygenerator.info/live.php?token=example",
  FALLBACK_TERMS_OF_SERVICE: "https://www.termsofservicegenerator.net/live.php?token=example",
  FALLBACK_HELP_SUPPORT: "mailto:support@supasecret.app",
} as const;

/**
 * Get the appropriate URL with fallback
 */
export const getPrivacyPolicyUrl = (): string => {
  return URLS.PRIVACY_POLICY;
};

export const getTermsOfServiceUrl = (): string => {
  return URLS.TERMS_OF_SERVICE;
};

export const getHelpSupportUrl = (): string => {
  return URLS.HELP_SUPPORT;
};
