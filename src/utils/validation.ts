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
 * Specific validation functions for app entities
 */
export const confessionValidation = {
  content: (content: string): ValidationResult =>
    validateField(content, [
      validators.required("Please enter your confession"),
      validators.minLength(10, "Your confession is too short. Please write at least 10 characters."),
      validators.maxLength(280, "Your confession is too long. Please keep it under 280 characters."),
    ]),

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
