/**
 * Color contrast utilities for accessibility compliance
 * Ensures WCAG 2.1 AA compliance for text and UI elements
 */

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export interface ContrastResult {
  ratio: number;
  isAACompliant: boolean;
  isAAACompliant: boolean;
  level: 'fail' | 'aa' | 'aaa';
}

// WCAG 2.1 contrast ratio requirements
const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
};

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex: string): ColorRGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Convert RGB to hex
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  // Validate inputs
  const validateChannel = (value: number, channel: string) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(`Invalid ${channel} channel value: ${value}. Must be an integer between 0 and 255.`);
    }
  };

  validateChannel(r, 'red');
  validateChannel(g, 'green');
  validateChannel(b, 'blue');

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Convert RGB to HSL
 */
export const rgbToHsl = (r: number, g: number, b: number): ColorHSL => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * Convert HSL to RGB
 */
export const hslToRgb = (h: number, s: number, l: number): ColorRGB => {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

/**
 * Calculate relative luminance of a color
 */
export const getRelativeLuminance = (rgb: ColorRGB): number => {
  const { r, g, b } = rgb;

  const sRGB = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG contrast requirements
 */
export const checkContrast = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): ContrastResult => {
  const ratio = getContrastRatio(foreground, background);
  
  const aaThreshold = isLargeText ? CONTRAST_RATIOS.AA_LARGE : CONTRAST_RATIOS.AA_NORMAL;
  const aaaThreshold = isLargeText ? CONTRAST_RATIOS.AAA_LARGE : CONTRAST_RATIOS.AAA_NORMAL;

  const isAACompliant = ratio >= aaThreshold;
  const isAAACompliant = ratio >= aaaThreshold;

  let level: 'fail' | 'aa' | 'aaa' = 'fail';
  if (isAAACompliant) level = 'aaa';
  else if (isAACompliant) level = 'aa';

  return {
    ratio,
    isAACompliant,
    isAAACompliant,
    level,
  };
};

/**
 * Generate accessible color variations
 */
export const generateAccessibleColor = (
  baseColor: string,
  backgroundColor: string,
  targetRatio: number = CONTRAST_RATIOS.AA_NORMAL
): string => {
  const baseRgb = hexToRgb(baseColor);
  const bgRgb = hexToRgb(backgroundColor);

  if (!baseRgb || !bgRgb) return baseColor;

  const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
  let { h, s, l } = baseHsl;

  // Determine if we need to make the color lighter or darker
  const bgLuminance = getRelativeLuminance(bgRgb);
  const shouldDarken = bgLuminance > 0.5;

  // Binary search for the right lightness value
  let minL = shouldDarken ? 0 : l;
  let maxL = shouldDarken ? l : 100;
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations && Math.abs(maxL - minL) > 1) {
    const testL = (minL + maxL) / 2;
    const testRgb = hslToRgb(h, s, testL);
    const testHex = rgbToHex(testRgb.r, testRgb.g, testRgb.b);
    const ratio = getContrastRatio(testHex, backgroundColor);

    if (ratio >= targetRatio) {
      if (shouldDarken) {
        maxL = testL;
      } else {
        minL = testL;
      }
    } else {
      if (shouldDarken) {
        minL = testL;
      } else {
        maxL = testL;
      }
    }

    iterations++;
  }

  const finalL = (minL + maxL) / 2;
  const finalRgb = hslToRgb(h, s, finalL);
  return rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
};

/**
 * Predefined accessible color combinations
 */
export const AccessibleColors = {
  // Dark theme colors
  dark: {
    background: '#000000',
    surface: '#1A1A1A',
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
  },
  
  // Light theme colors
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    primary: '#1D4ED8',
    secondary: '#7C3AED',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    text: '#000000',
    textSecondary: '#374151',
    textMuted: '#6B7280',
  },
};

/**
 * Validate all color combinations in a theme
 */
export const validateThemeContrast = (theme: Record<string, string>) => {
  const results: Record<string, ContrastResult> = {};
  
  // Check text colors against backgrounds
  const textColors = Object.keys(theme).filter(key => key.includes('text'));
  const backgroundColors = Object.keys(theme).filter(key => 
    key.includes('background') || key.includes('surface')
  );

  textColors.forEach(textKey => {
    backgroundColors.forEach(bgKey => {
      const key = `${textKey}-on-${bgKey}`;
      results[key] = checkContrast(theme[textKey], theme[bgKey]);
    });
  });

  return results;
};
