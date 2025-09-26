/**
 * Comprehensive input validation utilities
 * Provides consistent validation across the app
 */

import React from "react";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Interface for a validation rule
 * @template T - The type of value being validated
 */
export interface ValidationRule<T = unknown> {
  /** Function to validate the value */
  validate: (value: T) => ValidationResult;
  /** Optional error message */
  message?: string;
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  hashtag: /^#[a-zA-Z0-9_]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
} as const;

/**
 * Basic validation functions
 */
export const validators = {
  required: (message = "This field is required"): ValidationRule<any> => ({
    validate: (value) => ({
      isValid: value !== null && value !== undefined && value !== "",
      error: value === null || value === undefined || value === "" ? message : undefined,
    }),
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && value.length >= min,
      error:
        typeof value !== "string" || value.length < min
          ? message || `Must be at least ${min} characters long`
          : undefined,
    }),
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && value.length <= max,
      error:
        typeof value !== "string" || value.length > max
          ? message || `Must be no more than ${max} characters long`
          : undefined,
    }),
  }),

  pattern: (pattern: RegExp, message = "Invalid format"): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && pattern.test(value),
      error: typeof value !== "string" || !pattern.test(value) ? message : undefined,
    }),
  }),

  email: (message = "Please enter a valid email address"): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && VALIDATION_PATTERNS.email.test(value),
      error: typeof value !== "string" || !VALIDATION_PATTERNS.email.test(value) ? message : undefined,
    }),
  }),

  password: (
    message = "Password must be at least 8 characters with uppercase, lowercase, and number",
  ): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value !== "string") {
        return { isValid: false, error: "Password must be a string" };
      }

      if (value.length < 8) {
        return { isValid: false, error: "Password must be at least 8 characters long" };
      }

      // Check for unsupported characters (whitespace)
      if (/\s/.test(value)) {
        return { isValid: false, error: "Password contains unsupported characters" };
      }

      if (!/[a-z]/.test(value)) {
        return { isValid: false, error: "Password must contain at least one lowercase letter" };
      }

      if (!/[A-Z]/.test(value)) {
        return { isValid: false, error: "Password must contain at least one uppercase letter" };
      }

      if (!/\d/.test(value)) {
        return { isValid: false, error: "Password must contain at least one number" };
      }

      const warnings: string[] = [];
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        warnings.push("Consider adding special characters for extra security");
      }

      const isStrong = VALIDATION_PATTERNS.password.test(value);

      return {
        isValid: isStrong,
        error: isStrong ? undefined : message,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  }),

  confirmPassword: (originalPassword: string, message = "Passwords do not match"): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && value === originalPassword,
      error: typeof value !== "string" || value !== originalPassword ? message : undefined,
    }),
  }),

  username: (
    message = "Username must be 3-20 characters, letters, numbers, and underscores only",
  ): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && VALIDATION_PATTERNS.username.test(value),
      error: typeof value !== "string" || !VALIDATION_PATTERNS.username.test(value) ? message : undefined,
    }),
  }),

  url: (message = "Please enter a valid URL"): ValidationRule<string> => ({
    validate: (value) => ({
      isValid: typeof value === "string" && VALIDATION_PATTERNS.url.test(value),
      error: typeof value !== "string" || !VALIDATION_PATTERNS.url.test(value) ? message : undefined,
    }),
  }),

  range: (min: number, max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => ({
      isValid: typeof value === "number" && value >= min && value <= max,
      error:
        typeof value !== "number" || value < min || value > max
          ? message || `Must be between ${min} and ${max}`
          : undefined,
    }),
  }),

  oneOf: <T>(options: T[], message?: string): ValidationRule<T> => ({
    validate: (value) => ({
      isValid: options.includes(value),
      error: !options.includes(value) ? message || `Must be one of: ${options.join(", ")}` : undefined,
    }),
  }),

  // Video-specific validation rules
  videoFile: (message = "Please select a valid video file"): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) {
        return { isValid: false, error: message };
      }

      // Check if it's a valid file object (React Native or web)
      if (typeof value === "object" && (value.uri || value.path || value.name)) {
        const fileName = value.name || value.uri || value.path || "";
        const validExtensions = [".mp4", ".mov", ".avi", ".mkv", ".m4v", ".3gp", ".webm"];
        const hasValidExtension = validExtensions.some((ext) => fileName.toLowerCase().includes(ext));

        if (!hasValidExtension) {
          return {
            isValid: false,
            error: `Unsupported video format. Please use: ${validExtensions.join(", ")}`,
          };
        }

        return { isValid: true };
      }

      // Check if it's a URL
      if (typeof value === "string" && /^https?:\/\//.test(value)) {
        return { isValid: true };
      }

      return { isValid: false, error: message };
    },
  }),

  videoDuration: (maxSeconds: number = 60, message?: string): ValidationRule<number> => ({
    validate: (value) => ({
      isValid: typeof value === "number" && value > 0 && value <= maxSeconds,
      error:
        typeof value !== "number" || value <= 0 || value > maxSeconds
          ? message || `Video must be between 1 and ${maxSeconds} seconds long`
          : undefined,
    }),
  }),

  videoSize: (maxSizeMB: number = 100, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      return {
        isValid: typeof value === "number" && value > 0 && value <= maxSizeBytes,
        error:
          typeof value !== "number" || value <= 0 || value > maxSizeBytes
            ? message || `Video size must be less than ${maxSizeMB}MB`
            : undefined,
      };
    },
  }),

  videoFormat: (supportedFormats: string[] = ["mp4", "mov", "avi"], message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value !== "string") {
        return { isValid: false, error: "Invalid video format" };
      }

      const format = value.toLowerCase();
      const isSupported = supportedFormats.some((fmt) => format.includes(fmt));

      return {
        isValid: isSupported,
        error: !isSupported ? message || `Unsupported format. Supported: ${supportedFormats.join(", ")}` : undefined,
      };
    },
  }),
};

/**
 * Validate a single field with multiple rules
 */
export function validateField<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    // Skip validation if value is null/undefined and rule doesn't handle it
    if (value === null || value === undefined) {
      continue;
    }

    const result = rule.validate(value);

    if (!result.isValid && result.error) {
      errors.push(result.error);
    }

    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors[0], // Return first error
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate an object with field rules
 */
type FieldRules<T> = { [K in keyof T]?: ValidationRule<NonNullable<T[K]>>[] };

export function validateObject<T extends Record<string, unknown>>(
  data: T,
  rules: FieldRules<T>,
): Record<keyof T, ValidationResult> & { isValid: boolean } {
  const results = {} as Record<keyof T, ValidationResult>;
  let isValid = true;

  for (const field of Object.keys(rules) as (keyof T)[]) {
    const fieldRules = rules[field];
    if (fieldRules) {
      const result = validateField(
        data[field] as NonNullable<T[typeof field]>,
        fieldRules as ValidationRule<NonNullable<T[typeof field]>>[],
      );
      results[field] = result;

      if (!result.isValid) {
        isValid = false;
      }
    }
  }

  return { ...results, isValid };
}

/**
 * Video processing options validation
 */
export interface VideoProcessingOptions {
  quality?: "low" | "medium" | "high";
  voiceEffect?: "none" | "robot" | "whisper" | "deep";
  transcriptionEnabled?: boolean;
  backgroundMusic?: boolean;
  filters?: string[];
}

export function validateVideoProcessingOptions(options: VideoProcessingOptions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate quality setting
  if (options.quality && !["low", "medium", "high"].includes(options.quality)) {
    errors.push("Invalid quality setting. Must be low, medium, or high.");
  }

  // Validate voice effect
  if (options.voiceEffect && !["none", "robot", "whisper", "deep"].includes(options.voiceEffect)) {
    errors.push("Invalid voice effect. Must be none, robot, whisper, or deep.");
  }

  // Validate filters
  if (options.filters && Array.isArray(options.filters)) {
    const validFilters = ["blur", "vintage", "noir", "bright", "contrast"];
    const invalidFilters = options.filters.filter((filter) => !validFilters.includes(filter));
    if (invalidFilters.length > 0) {
      errors.push(`Invalid filters: ${invalidFilters.join(", ")}. Valid options: ${validFilters.join(", ")}`);
    }

    if (options.filters.length > 3) {
      warnings.push("Using more than 3 filters may significantly slow down processing.");
    }
  }

  // Environment-specific validations
  if (typeof __DEV__ !== "undefined") {
    if (options.quality === "high" && options.voiceEffect && options.voiceEffect !== "none") {
      warnings.push("High quality with voice effects may take longer to process in development.");
    }

    if (options.transcriptionEnabled && options.voiceEffect && options.voiceEffect !== "none") {
      warnings.push("Transcription works best without heavy voice effects.");
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors[0] : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Comprehensive video validation
 */
export const videoValidation = {
  videoFile: (file: any): ValidationResult => validateField(file, [validators.videoFile()]),

  videoDuration: (durationSeconds: number, maxDuration: number = 60): ValidationResult =>
    validateField(durationSeconds, [validators.videoDuration(maxDuration)]),

  videoSize: (sizeBytes: number, maxSizeMB: number = 100): ValidationResult =>
    validateField(sizeBytes, [validators.videoSize(maxSizeMB)]),

  videoFormat: (format: string, supportedFormats: string[] = ["mp4", "mov", "avi"]): ValidationResult =>
    validateField(format, [validators.videoFormat(supportedFormats)]),

  // Combined video validation for complete video objects
  completeVideo: (
    video: {
      file?: any;
      duration?: number;
      size?: number;
      format?: string;
    },
    options?: {
      maxDuration?: number;
      maxSizeMB?: number;
      supportedFormats?: string[];
    },
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const maxDuration = options?.maxDuration ?? 60;
    const maxSizeMB = options?.maxSizeMB ?? 100;
    const supportedFormats = options?.supportedFormats ?? ["mp4", "mov", "avi"];

    // Validate file if provided
    if (video.file) {
      const fileResult = videoValidation.videoFile(video.file);
      if (!fileResult.isValid && fileResult.error) {
        errors.push(fileResult.error);
      }
    }

    // Validate duration if provided
    if (typeof video.duration === "number") {
      const durationResult = videoValidation.videoDuration(video.duration, maxDuration);
      if (!durationResult.isValid && durationResult.error) {
        errors.push(durationResult.error);
      }

      // Duration warnings
      if (video.duration < 3) {
        warnings.push("Very short videos may not provide enough context.");
      }
      if (video.duration > maxDuration * 0.8) {
        warnings.push(`Video is close to the ${maxDuration}s limit.`);
      }
    }

    // Validate size if provided
    if (typeof video.size === "number") {
      const sizeResult = videoValidation.videoSize(video.size, maxSizeMB);
      if (!sizeResult.isValid && sizeResult.error) {
        errors.push(sizeResult.error);
      }

      // Size warnings
      const sizeMB = video.size / (1024 * 1024);
      if (sizeMB > maxSizeMB * 0.8) {
        warnings.push(`Video size (${sizeMB.toFixed(1)}MB) is close to the ${maxSizeMB}MB limit.`);
      }
    }

    // Validate format if provided
    if (video.format) {
      const formatResult = videoValidation.videoFormat(video.format, supportedFormats);
      if (!formatResult.isValid && formatResult.error) {
        errors.push(formatResult.error);
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors[0] : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },
};

/**
 * Specific validation functions for app entities
 */
export const confessionValidation = {
  content: (content: string, includeVideoChecks: boolean = false): ValidationResult => {
    const baseRules = [
      validators.required("Please enter your confession"),
      validators.minLength(10, "Your confession is too short. Please write at least 10 characters."),
      validators.maxLength(280, "Your confession is too long. Please keep it under 280 characters."),
    ];

    const result = validateField(content, baseRules);

    // Add video-specific content validation
    if (includeVideoChecks && result.isValid) {
      const warnings: string[] = result.warnings || [];

      // Check for video-related keywords that might indicate user wants to upload video
      const videoKeywords = ["video", "recording", "clip", "footage", "camera"];
      const hasVideoKeywords = videoKeywords.some((keyword) => content.toLowerCase().includes(keyword));

      if (hasVideoKeywords && content.length < 50) {
        warnings.push("Consider adding more context if you're planning to include a video.");
      }

      return {
        ...result,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    return result;
  },

  hashtags: (hashtags: string[]): ValidationResult => {
    if (hashtags.length > 5) {
      return { isValid: false, error: "Maximum 5 hashtags allowed" };
    }

    for (const hashtag of hashtags) {
      if (!VALIDATION_PATTERNS.hashtag.test(hashtag)) {
        return { isValid: false, error: `Invalid hashtag format: ${hashtag}` };
      }
    }

    return { isValid: true };
  },

  // Combined confession validation with optional video
  complete: (data: {
    content: string;
    type: "text" | "video";
    video?: {
      file?: any;
      duration?: number;
      size?: number;
      format?: string;
    };
    hashtags?: string[];
  }): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate content
    const contentResult = confessionValidation.content(data.content, data.type === "video");
    if (!contentResult.isValid && contentResult.error) {
      errors.push(contentResult.error);
    }
    if (contentResult.warnings) {
      warnings.push(...contentResult.warnings);
    }

    // Validate video if provided
    if (data.type === "video") {
      if (!data.video || !data.video.file) {
        errors.push("Video file is required for video confessions.");
      } else {
        const videoResult = videoValidation.completeVideo(data.video);
        if (!videoResult.isValid && videoResult.error) {
          errors.push(videoResult.error);
        }
        if (videoResult.warnings) {
          warnings.push(...videoResult.warnings);
        }
      }
    }

    // Validate hashtags if provided
    if (data.hashtags && data.hashtags.length > 0) {
      const hashtagResult = confessionValidation.hashtags(data.hashtags);
      if (!hashtagResult.isValid && hashtagResult.error) {
        errors.push(hashtagResult.error);
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors[0] : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },
};

export const authValidation = {
  signUp: (data: { email: string; password: string; confirmPassword: string; username?: string }) =>
    validateObject(data, {
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.password()],
      confirmPassword: [validators.required(), validators.confirmPassword(data.password)],
      username: data.username ? [validators.required(), validators.username()] : undefined,
    }),

  signIn: (data: { email: string; password: string }) =>
    validateObject(data, {
      email: [validators.required(), validators.email()],
      password: [validators.required()],
    }),
};

export const reportValidation = {
  reason: (reason: string): ValidationResult =>
    validateField(reason, [
      validators.required("Please select a reason for reporting"),
      validators.oneOf(["inappropriate", "spam", "harassment", "false_info", "violence", "hate_speech", "other"]),
    ]),

  details: (details: string, reason: string): ValidationResult => {
    const rules = [validators.maxLength(500, "Details must be under 500 characters")];

    if (reason === "other") {
      rules.unshift(validators.required('Please provide details for "Other" reports'));
      rules.push(validators.minLength(10, "Please provide more details (at least 10 characters)"));
    }

    return validateField(details, rules);
  },
};

/**
 * Real-time validation hook for forms
 */
export function useFormValidation<T extends Record<string, unknown>>(initialData: T, rules: FieldRules<T>) {
  const [data, setData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [warnings, setWarnings] = React.useState<Partial<Record<keyof T, string[]>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const validateFormField = React.useCallback(
    (field: keyof T, value: T[keyof T]) => {
      const fieldRules = rules[field];
      if (!fieldRules) return { isValid: true };

      const result = validateField(value as NonNullable<T[keyof T]>, fieldRules);

      setErrors((prev) => ({
        ...prev,
        [field]: result.error,
      }));

      setWarnings((prev) => ({
        ...prev,
        [field]: result.warnings,
      }));

      return result;
    },
    [rules],
  );

  const updateField = React.useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setData((prev) => ({ ...prev, [field]: value }));

      if (touched[field]) {
        validateFormField(field, value);
      }
    },
    [touched, validateFormField],
  );

  const touchField = React.useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validateFormField(field, data[field]);
    },
    [data, validateFormField],
  );

  const validateAll = React.useCallback(() => {
    const results = validateObject(data, rules);

    const newErrors: Partial<Record<keyof T, string>> = {};
    const newWarnings: Partial<Record<keyof T, string[]>> = {};

    for (const [field, result] of Object.entries(results) as [keyof T, ValidationResult][]) {
      if (field !== "isValid") {
        newErrors[field] = result.error;
        newWarnings[field] = result.warnings;
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    setTouched(Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    return results.isValid;
  }, [data, rules]);

  return {
    data,
    errors,
    warnings,
    touched,
    updateField,
    touchField,
    validateAll,
    isValid: Object.values(errors).every((error) => !error),
  };
}
