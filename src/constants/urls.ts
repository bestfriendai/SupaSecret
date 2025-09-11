/**
 * URL constants for external links
 */

export const URLS = {
  PRIVACY_POLICY: "https://toxicconfessions.app/privacy",
  TERMS_OF_SERVICE: "https://toxicconfessions.app/terms",
  HELP_SUPPORT: "https://toxicconfessions.app/help",
  CONTACT_US: "https://toxicconfessions.app/contact",

  // Fallback URLs if the main ones are not available
  FALLBACK_PRIVACY_POLICY: "https://www.privacypolicygenerator.info/live.php?token=example",
  FALLBACK_TERMS_OF_SERVICE: "https://www.termsofservicegenerator.net/live.php?token=example",
  FALLBACK_HELP_SUPPORT: "mailto:support@toxicconfessions.app",
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
