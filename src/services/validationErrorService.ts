import type { ValidationError, FormValidationError } from "../types";

// Types for form error handlers
export type FormErrorSetter = (
  field: string,
  error: { type: string; message: string }
) => void;
export type ToastFunction = (
  message: string,
  type: "error" | "warning"
) => void;

class ValidationErrorService {
  private toastFunction: ToastFunction | null = null;
  private activeToasts: Set<string> = new Set();

  // Set the toast function for global error display
  setToastFunction(toastFn: ToastFunction) {
    this.toastFunction = toastFn;
  }

  // Handle validation errors from API response
  handleApiValidationErrors(
    validationErrors: ValidationError[],
    formErrorSetter?: FormErrorSetter,
    fieldMapping?: Record<string, string>,
    showUnmappedAsToasts: boolean = true
  ): FormValidationError[] {
    const formErrors: FormValidationError[] = [];
    const unmappedErrors: ValidationError[] = [];

    validationErrors.forEach((error) => {
      // Map backend field key to frontend field name
      const frontendField = fieldMapping?.[error.key] || error.key;

      const formError: FormValidationError = {
        field: frontendField,
        message: error.errorMessage,
        type: "server",
        severity: error.severity === 0 ? "error" : "warning",
      };

      formErrors.push(formError);

      // Try to set form field error if setter is provided
      if (formErrorSetter) {
        try {
          formErrorSetter(frontendField, {
            type: "server",
            message: error.errorMessage,
          });
        } catch (e) {
          // If field doesn't exist in form, treat as unmapped
          unmappedErrors.push(error);
        }
      } else {
        unmappedErrors.push(error);
      }
    });

    // Show unmapped errors as toasts
    if (showUnmappedAsToasts) {
      if (unmappedErrors.length > 0) {
        this.showValidationErrorsAsToasts(unmappedErrors);
      } else if (validationErrors.length > 0) {
        // If all errors were mapped, still show a summary toast
        this.showValidationErrorsAsToasts(validationErrors);
      }
    }

    return formErrors;
  }

  // Show validation errors as toast notifications
  showValidationErrorsAsToasts(validationErrors: ValidationError[]) {
    if (!this.toastFunction) {
      console.warn("Toast function not set. Call setToastFunction() first.");
      return;
    }

    validationErrors.forEach((error) => {
      const toastType = error.severity === 0 ? "error" : "warning";
      const toastKey = `${error.key}-${error.errorMessage}`;

      // Avoid duplicate toasts
      if (!this.activeToasts.has(toastKey)) {
        this.activeToasts.add(toastKey);
        this.toastFunction!(error.errorMessage, toastType);

        // Remove from active toasts after 5 seconds
        setTimeout(() => {
          this.activeToasts.delete(toastKey);
        }, 5000);
      }
    });
  }

  // Process API error response and handle validation errors
  processApiError(
    error: any,
    formErrorSetter?: FormErrorSetter,
    fieldMapping?: Record<string, string>
  ): boolean {
    // Handle ApiError instances directly
    if (error?.status === 400 && error?.data) {
      const responseData = error.data;

      // Handle validationErrors array format
      if (responseData?.validationErrors?.length > 0) {
        this.handleApiValidationErrors(
          responseData.validationErrors,
          formErrorSetter,
          fieldMapping
        );
        return true;
      }

      // Handle ASP.NET Core model validation format
      if (responseData?.errors && typeof responseData.errors === "object") {
        const validationErrors = this.convertModelValidationToValidationErrors(
          responseData.errors
        );
        this.handleApiValidationErrors(
          validationErrors,
          formErrorSetter,
          fieldMapping
        );
        return true;
      }

      // Handle single error message
      if (responseData?.message) {
        if (this.toastFunction) {
          this.toastFunction(responseData.message, "error");
        }
        return true;
      }
    }

    // Check if it's a 400 error with validation errors (legacy format)
    if (error?.response?.status === 400) {
      const responseData = error.response.data;

      // Handle validationErrors array format
      if (responseData?.validationErrors?.length > 0) {
        this.handleApiValidationErrors(
          responseData.validationErrors,
          formErrorSetter,
          fieldMapping
        );
        return true;
      }

      // Handle ASP.NET Core model validation format
      if (responseData?.errors && typeof responseData.errors === "object") {
        const validationErrors = this.convertModelValidationToValidationErrors(
          responseData.errors
        );
        this.handleApiValidationErrors(
          validationErrors,
          formErrorSetter,
          fieldMapping
        );
        return true;
      }

      // Handle single error message
      if (responseData?.message) {
        if (this.toastFunction) {
          this.toastFunction(responseData.message, "error");
        }
        return true;
      }
    }

    return false; // Not a validation error
  }

  // Convert ASP.NET Core model validation errors to our format
  private convertModelValidationToValidationErrors(
    errors: Record<string, string[]>
  ): ValidationError[] {
    const validationErrors: ValidationError[] = [];

    Object.entries(errors).forEach(([field, messages]) => {
      messages.forEach((message) => {
        validationErrors.push({
          key: field,
          errorMessage: message,
          severity: 0, // Treat model validation as errors
        });
      });
    });

    return validationErrors;
  }

  // Create field mapping for common form fields
  createFieldMapping(
    customMapping?: Record<string, string>
  ): Record<string, string> {
    const defaultMapping = {
      // Schema fields
      Schema: "name",
      SchemaName: "name",
      "schema.name": "name",
      "schema.fields": "fields",

      // User fields
      Email: "email",
      FirstName: "firstName",
      LastName: "lastName",
      Phone: "phone",

      // Project fields
      ProjectName: "name",
      ProjectCode: "code",
      "project.name": "name",

      // Role fields
      RoleName: "name",
      "role.name": "name",
      PermissionIds: "permissionIds",

      // Common fields
      Name: "name",
      Description: "description",
      IsActive: "isActive",
    };

    return { ...defaultMapping, ...customMapping };
  }

  // Clear active toasts (useful for cleanup)
  clearActiveToasts() {
    this.activeToasts.clear();
  }

  // Get summary of validation errors for display
  getValidationErrorSummary(validationErrors: ValidationError[]): string {
    const errorCount = validationErrors.filter((e) => e.severity === 0).length;
    const warningCount = validationErrors.filter(
      (e) => e.severity === 1
    ).length;

    const parts = [];
    if (errorCount > 0)
      parts.push(`${errorCount} error${errorCount > 1 ? "s" : ""}`);
    if (warningCount > 0)
      parts.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);

    return parts.join(" and ");
  }
}

// Export singleton instance
export const validationErrorService = new ValidationErrorService();

// React Hook for validation error handling
export const useValidationErrorHandler = () => {
  return {
    handleApiError: validationErrorService.processApiError.bind(
      validationErrorService
    ),
    handleValidationErrors:
      validationErrorService.handleApiValidationErrors.bind(
        validationErrorService
      ),
    showErrorsAsToasts:
      validationErrorService.showValidationErrorsAsToasts.bind(
        validationErrorService
      ),
    createFieldMapping: validationErrorService.createFieldMapping.bind(
      validationErrorService
    ),
    getErrorSummary: validationErrorService.getValidationErrorSummary.bind(
      validationErrorService
    ),
  };
};
