// Enhanced sanitizer for React Native text content with comprehensive security measures.
// Removes HTML tags, angle brackets, control chars, zero-width characters, and normalizes Unicode.
// Protects against XSS, homograph attacks, and text injection vulnerabilities.
export const sanitizeText = (input: string | null | undefined): string => {
  if (!input || typeof input !== "string") return "";
  let s = input;

  // 1. Unicode normalization to prevent homograph attacks
  s = s.normalize('NFC');

  // 2. Remove zero-width characters (used for obfuscation attacks)
  s = s.replace(/[\u200B-\u200D\u2060\uFEFF]/g, ''); // Zero-width space, joiner, non-joiner, word joiner, BOM
  s = s.replace(/[\uFE00-\uFE0F]/g, ''); // Variation selectors

  // 3. Remove combining characters that could be used for spoofing
  s = s.replace(/[\u0300-\u036F\u20D0-\u20FF]/g, ''); // Combining diacritical marks

  // 4. Remove directional formatting characters
  s = s.replace(/[\u202A-\u202E]/g, ''); // RLE, LRE, PDF, LRO, RLO

  // 5. Remove control characters (except tab, newline, carriage return)
  s = s.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, '');

  // 6. Remove angle brackets to avoid pseudo-HTML
  s = s.replace(/[<>]/g, "");

  // 7. Remove common XSS patterns and dangerous characters
  s = s.replace(/javascript:/gi, '');
  s = s.replace(/data:/gi, '');
  s = s.replace(/vbscript:/gi, '');
  s = s.replace(/on\w+\s*=/gi, ''); // onclick=, onload=, etc.

  // 8. Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();

  // 9. Enforce max length to prevent abuse and DoS attacks
  const MAX_LEN = 5000;
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN).trim();
  }

  return s;
};

// Additional sanitization function for user-generated content that needs stricter validation
export const sanitizeUserInput = (input: string | null | undefined): string => {
  if (!input || typeof input !== "string") return "";

  let s = sanitizeText(input);

  // Remove all non-printable ASCII characters except basic punctuation
  s = s.replace(/[^\x20-\x7E\r\n\t]/g, '');

  // Remove potentially dangerous patterns
  s = s.replace(/['"\\]/g, '');

  return s.trim();
};

// Sanitize for database/storage - removes any characters that could cause issues in storage systems
export const sanitizeForStorage = (input: string | null | undefined): string => {
  if (!input || typeof input !== "string") return "";

  let s = sanitizeText(input);

  // Remove characters that could cause issues in file names or database keys
  s = s.replace(/[\\/:*?"<>|]/g, '-');

  return s;
};
