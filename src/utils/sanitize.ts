// Lightweight sanitizer for React Native text content.
// Removes HTML tags, angle brackets, control chars, and trims whitespace.
// Note: React Native Text doesn't render HTML, but this guards against accidental injection when
// strings are passed to webviews or serialized elsewhere.
export const sanitizeText = (input: string | null | undefined): string => {
  if (!input || typeof input !== "string") return "";
  let s = input;
  // Normalize whitespace
  s = s.replace(/\s+/g, " ");
  // Remove angle brackets to avoid pseudo-HTML
  s = s.replace(/[<>]/g, "");
  // Remove control characters (except tab/newline)
  s = s.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "");
  // Optional: enforce max length to prevent abuse
  const MAX_LEN = 5000;
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN);
  return s.trim();
};
