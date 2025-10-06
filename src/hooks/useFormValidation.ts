import { useCallback, useState } from "react";
import { useNotifications } from "../services/notificationService";
import { ApiError } from "../config/api";
import type { FormFieldMapping, FormErrorSetter } from "../types";

// Form error state type
export interface FormFieldError {
  type: string;
  message: string;
}

export interface FormErrors {
  [fieldName: string]: FormFieldError | undefined;
}

export interface UseFormValidationOptions {
  fieldMapping?: FormFieldMapping;
  onErrorsChange?: (errors: FormErrors) => void;
  showSuccessNotifications?: boolean;
}

export const useFormValidation = ({
  fieldMapping = {},
  onErrorsChange,
  showSuccessNotifications = true,
}: UseFormValidationOptions = {}) => {
  const [errors, setErrors] = useState<FormErrors>({});
  const notifications = useNotifications();

  // Set error for a specific field
  const setFieldError = useCallback(
    (field: string, error: FormFieldError) => {
      setErrors((prev) => {
        const newErrors = { ...prev, [field]: error };
        onErrorsChange?.(newErrors);
        return newErrors;
      });
    },
    [onErrorsChange]
  );

  // Clear error for a specific field
  const clearFieldError = useCallback(
    (field: string) => {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        onErrorsChange?.(newErrors);
        return newErrors;
      });
    },
    [onErrorsChange]
  );

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
    onErrorsChange?.({});
  }, [onErrorsChange]);

  // Clear only server errors
  const clearServerErrors = useCallback(() => {
    setErrors((prev) => {
      const newErrors = Object.entries(prev).reduce((acc, [field, error]) => {
        if (error && error.type !== "server") {
          acc[field] = error;
        }
        return acc;
      }, {} as FormErrors);
      onErrorsChange?.(newErrors);
      return newErrors;
    });
  }, [onErrorsChange]);

  // Create form error setter function for notification service
  const formErrorSetter: FormErrorSetter = useCallback(
    (field: string, error: { type: string; message: string }) => {
      setFieldError(field, error);
    },
    [setFieldError]
  );

  // Handle API errors with form validation integration
  const handleFormApiError = useCallback(
    (error: unknown, customFieldMapping?: FormFieldMapping) => {
      if (error instanceof ApiError) {
        if (error.isValidationError()) {
          // Use notification service to handle validation errors
          const mapping = { ...fieldMapping, ...customFieldMapping };
          return notifications.handleApiError(
            error.data,
            formErrorSetter,
            mapping
          );
        } else {
          // Handle non-validation errors
          notifications.error(error.message);
          return { mappedToFields: 0, unmappedErrors: [], totalErrors: 1 };
        }
      }

      // Handle generic errors
      if (error instanceof Error) {
        notifications.error(error.message);
      } else if (typeof error === "string") {
        notifications.error(error);
      } else {
        notifications.error("An unexpected error occurred");
      }

      return { mappedToFields: 0, unmappedErrors: [], totalErrors: 1 };
    },
    [notifications, formErrorSetter, fieldMapping]
  );

  // Handle successful operations
  const handleSuccess = useCallback(
    (message?: string) => {
      if (showSuccessNotifications && message) {
        notifications.success(message);
      }
      clearAllErrors();
    },
    [notifications, showSuccessNotifications, clearAllErrors]
  );

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    clearServerErrors,
    handleFormApiError,
    handleSuccess,
    formErrorSetter,
    hasError: (field: string) => !!errors[field],
    getError: (field: string) => errors[field]?.message || "",
    getErrorType: (field: string) => errors[field]?.type || "",
    hasAnyErrors: () => Object.keys(errors).length > 0,
    getFieldErrors: () => errors,
  };
};

// Simplified hook for handling API responses without forms
export const useApiResponseHandler = () => {
  const notifications = useNotifications();

  const handleApiResponse = useCallback(
    (response: any) => {
      if (response && typeof response === "object") {
        notifications.handleApiResponse(response);
      }
    },
    [notifications]
  );

  const handleApiError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        if (error.isValidationError()) {
          notifications.handleApiError(error.data);
        } else {
          notifications.error(error.message);
        }
      } else if (error instanceof Error) {
        notifications.error(error.message);
      } else {
        notifications.error("An unexpected error occurred");
      }
    },
    [notifications]
  );

  return {
    handleApiResponse,
    handleApiError,
    success: notifications.success,
    error: notifications.error,
    warning: notifications.warning,
    info: notifications.info,
  };
};
