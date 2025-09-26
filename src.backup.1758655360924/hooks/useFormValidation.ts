import { useState, useCallback, useMemo } from "react";

// Simple sanitizer for React Native environments
const sanitizeHTML = (input: string): string => {
  // Basic sanitization for React Native
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
};

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FieldConfig {
  rules: ValidationRule;
  sanitize?: (value: string) => string;
}

export interface FormConfig {
  [fieldName: string]: FieldConfig;
}

export interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
  isValid: boolean;
}

export interface FormState {
  [fieldName: string]: FieldState;
}

/**
 * Comprehensive form validation hook with real-time validation,
 * character limits, error states, and input sanitization
 */
export const useFormValidation = (config: FormConfig, initialValues: Record<string, string> = {}) => {
  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(config).forEach((fieldName) => {
      state[fieldName] = {
        value: initialValues[fieldName] || "",
        error: null,
        touched: false,
        isValid: true,
      };
    });
    return state;
  });

  // Input sanitization functions
  const sanitizeInput = useCallback(
    (value: string, fieldName: string): string => {
      const fieldConfig = config[fieldName];
      if (fieldConfig?.sanitize) {
        return fieldConfig.sanitize(value);
      }

      // Basic XSS sanitization for React Native
      return sanitizeHTML(value);
    },
    [config],
  );

  // Validation function
  const validateField = useCallback(
    (fieldName: string, value: string): string | null => {
      const rules = config[fieldName]?.rules;
      if (!rules) return null;

      // Required validation
      if (rules.required && (!value || value.trim().length === 0)) {
        return "This field is required";
      }

      // Skip other validations if field is empty and not required
      if (!value || value.trim().length === 0) {
        return null;
      }

      // Min length validation
      if (rules.minLength && value.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }

      // Max length validation
      if (rules.maxLength && value.length > rules.maxLength) {
        return `Must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return "Invalid format";
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) return customError;
      }

      return null;
    },
    [config],
  );

  // Update field value with validation and sanitization
  const updateField = useCallback(
    (fieldName: string, value: string, shouldValidate: boolean = true) => {
      const sanitizedValue = sanitizeInput(value, fieldName);
      const error = shouldValidate ? validateField(fieldName, sanitizedValue) : null;

      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value: sanitizedValue,
          error,
          isValid: error === null,
          touched: true,
        },
      }));
    },
    [sanitizeInput, validateField],
  );

  // Touch field (mark as touched without changing value)
  const touchField = useCallback(
    (fieldName: string) => {
      setFormState((prev) => {
        const error = validateField(fieldName, prev[fieldName].value);
        return {
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            touched: true,
            error,
            isValid: error === null,
          },
        };
      });
    },
    [validateField],
  );

  // Validate all fields
  const validateAll = useCallback(() => {
    let hasErrors = false;

    setFormState((prev) => {
      const newState = { ...prev };

      Object.keys(config).forEach((fieldName) => {
        const error = validateField(fieldName, prev[fieldName].value);
        newState[fieldName] = {
          ...prev[fieldName],
          error,
          isValid: error === null,
          touched: true,
        };
        if (error) hasErrors = true;
      });

      return newState;
    });

    return !hasErrors;
  }, [config, validateField]);

  // Reset form
  const resetForm = useCallback(
    (newInitialValues?: Record<string, string>) => {
      const values = newInitialValues || initialValues;
      const state: FormState = {};
      Object.keys(config).forEach((fieldName) => {
        state[fieldName] = {
          value: values[fieldName] || "",
          error: null,
          touched: false,
          isValid: true,
        };
      });
      setFormState(state);
    },
    [config, initialValues],
  );

  // Get field props for easy integration with input components
  const getFieldProps = useCallback(
    (fieldName: string) => {
      const field = formState[fieldName];
      const rules = config[fieldName]?.rules;

      return {
        value: field?.value || "",
        error: field?.error,
        isValid: field?.isValid ?? true,
        touched: field?.touched ?? false,
        maxLength: rules?.maxLength,
        required: rules?.required ?? false,
        onChangeText: (value: string) => updateField(fieldName, value),
        onBlur: () => touchField(fieldName),
      };
    },
    [formState, config, updateField, touchField],
  );

  // Computed values
  const isFormValid = useMemo(() => {
    return Object.values(formState).every((field) => field.isValid);
  }, [formState]);

  const hasErrors = useMemo(() => {
    return Object.values(formState).some((field) => field.error !== null);
  }, [formState]);

  const touchedFields = useMemo(() => {
    return Object.values(formState).filter((field) => field.touched).length;
  }, [formState]);

  // Get form values
  const getValues = useCallback(() => {
    const values: Record<string, string> = {};
    Object.keys(formState).forEach((fieldName) => {
      values[fieldName] = formState[fieldName].value;
    });
    return values;
  }, [formState]);

  return {
    formState,
    updateField,
    touchField,
    validateAll,
    resetForm,
    getFieldProps,
    getValues,
    isFormValid,
    hasErrors,
    touchedFields,
  };
};

// Common validation rules
export const ValidationRules = {
  email: {
    required: true,
    // Use a more comprehensive RFC-compatible email regex
    pattern:
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    maxLength: 254,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
  confession: {
    required: true,
    minLength: 10,
    maxLength: 500,
  },
  reply: {
    required: true,
    minLength: 1,
    maxLength: 280,
  },
} as const;

// Common sanitization functions
export const SanitizationFunctions = {
  trimAndClean: (value: string) => value.trim().replace(/\s+/g, " "),
  alphanumericOnly: (value: string) => value.replace(/[^a-zA-Z0-9]/g, ""),
  emailFormat: (value: string) => value.toLowerCase().trim(),
  // Whitelist approach for safe characters - only allow alphanumeric, spaces, and common safe punctuation
  safeTextOnly: (value: string) => value.replace(/[^a-zA-Z0-9\s\-_.@]/g, ""),
  // HTML escape function for output sanitization
  escapeHtml: (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;"),
} as const;
