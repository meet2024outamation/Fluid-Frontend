import type {
  NotificationMessage,
  NotificationOptions,
  NotificationService as INotificationService,
  ApiResponse,
  ApiErrorResponse,
  FormErrorSetter,
  FormFieldMapping,
  FormNotificationResult,
  ValidationError,
} from "../types";

// Default notification options
const DEFAULT_OPTIONS: NotificationOptions = {
  duration: 5000,
  position: "top-right",
  showIcon: true,
  closable: true,
};

class NotificationService implements INotificationService {
  private notifications: NotificationMessage[] = [];
  private listeners: ((notifications: NotificationMessage[]) => void)[] = [];
  private nextId = 1;

  // Subscribe to notification updates
  subscribe(
    listener: (notifications: NotificationMessage[]) => void
  ): () => void {
    this.listeners.push(listener);
    listener(this.notifications); // Send current state

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Show success notification
  success(message: string, options?: NotificationOptions): string {
    return this.show("success", message, undefined, options);
  }

  // Show error notification
  error(message: string, options?: NotificationOptions): string {
    return this.show("error", message, undefined, options);
  }

  // Show warning notification
  warning(message: string, options?: NotificationOptions): string {
    return this.show("warning", message, undefined, options);
  }

  // Show info notification
  info(message: string, options?: NotificationOptions): string {
    return this.show("info", message, undefined, options);
  }

  // Remove notification by ID
  remove(id: string): void {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.notifyListeners();
    }
  }

  // Clear all notifications
  clear(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  // Handle standardized API responses
  handleApiResponse<T>(
    response: ApiResponse<T>,
    options?: NotificationOptions
  ): void {
    if (response.success) {
      if (response.message) {
        this.success(response.message, options);
      }
    } else {
      // Handle error response
      const errorMessage =
        response.message || response.error || "An error occurred";
      this.error(errorMessage, options);

      // Handle validation errors as separate notifications
      if (response.validationErrors && response.validationErrors.length > 0) {
        response.validationErrors.forEach((validationError) => {
          this.warning(validationError.errorMessage, {
            ...options,
            duration: (options?.duration ?? DEFAULT_OPTIONS.duration!) + 2000, // Longer for validation errors
          });
        });
      }

      // Handle ASP.NET Core model validation errors
      if (
        response.errors &&
        typeof response.errors === "object" &&
        !Array.isArray(response.errors)
      ) {
        Object.entries(response.errors).forEach(([field, messages]) => {
          messages.forEach((message) => {
            this.warning(`${field}: ${message}`, options);
          });
        });
      }

      // Handle array errors
      if (Array.isArray(response.errors)) {
        response.errors.forEach((error) => {
          this.error(error, options);
        });
      }
    }
  }

  // Handle API errors with form integration
  handleApiError(
    error: ApiErrorResponse,
    formErrorSetter?: FormErrorSetter,
    fieldMapping?: FormFieldMapping
  ): FormNotificationResult {
    let mappedToFields = 0;
    const unmappedErrors: ValidationError[] = [];
    let totalErrors = 0;

    // Handle validation errors with form field mapping
    if (error.validationErrors && error.validationErrors.length > 0) {
      totalErrors = error.validationErrors.length;

      error.validationErrors.forEach((validationError) => {
        // Try to map to form field
        const frontendField =
          fieldMapping?.[validationError.key] || validationError.key;

        if (formErrorSetter) {
          try {
            formErrorSetter(frontendField, {
              type: "server",
              message: validationError.errorMessage,
            });
            mappedToFields++;
          } catch (e) {
            // Field doesn't exist in form, show as notification
            unmappedErrors.push(validationError);
          }
        } else {
          unmappedErrors.push(validationError);
        }
      });
    }

    // Handle ASP.NET Core model validation errors
    if (
      error.errors &&
      typeof error.errors === "object" &&
      !Array.isArray(error.errors)
    ) {
      Object.entries(error.errors).forEach(([field, messages]) => {
        messages.forEach((message) => {
          totalErrors++;
          const frontendField = fieldMapping?.[field] || field;

          if (formErrorSetter) {
            try {
              formErrorSetter(frontendField, {
                type: "server",
                message,
              });
              mappedToFields++;
            } catch (e) {
              unmappedErrors.push({
                key: field,
                errorMessage: message,
                severity: 0,
              });
            }
          } else {
            unmappedErrors.push({
              key: field,
              errorMessage: message,
              severity: 0,
            });
          }
        });
      });
    }

    // Show unmapped errors as notifications
    unmappedErrors.forEach((validationError) => {
      const type = validationError.severity === 0 ? "error" : "warning";
      if (type === "error") {
        this.error(validationError.errorMessage);
      } else {
        this.warning(validationError.errorMessage);
      }
    });

    // Show general error message if present
    if (error.message) {
      this.error(error.message);
    }

    return {
      mappedToFields,
      unmappedErrors,
      totalErrors,
    };
  }

  // Create default field mapping
  createDefaultFieldMapping(): FormFieldMapping {
    return {
      // Common mappings
      Name: "name",
      Description: "description",
      Email: "email",
      FirstName: "firstName",
      LastName: "lastName",
      Phone: "phone",
      Password: "password",
      ConfirmPassword: "confirmPassword",

      // Schema specific
      Schema: "name",
      SchemaName: "name",
      "schema.name": "name",
      "schema.description": "description",

      // User specific
      "user.firstName": "firstName",
      "user.lastName": "lastName",
      "user.email": "email",

      // Project specific
      "project.name": "name",
      "project.description": "description",
      ProjectName: "name",
      ProjectCode: "code",

      // Role specific
      "role.name": "name",
      RoleName: "name",
      PermissionIds: "permissionIds",
    };
  }

  // Show notification with auto-dismiss
  private show(
    type: NotificationMessage["type"],
    message: string,
    title?: string,
    options?: NotificationOptions
  ): string {
    const notification: NotificationMessage = {
      id: `notification-${this.nextId++}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      options: { ...DEFAULT_OPTIONS, ...options },
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    const duration = notification.options?.duration;
    if (duration && duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, duration);
    }

    return notification.id;
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  // Get all notifications
  getAll(): NotificationMessage[] {
    return [...this.notifications];
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// React hook for using notification service
export const useNotifications = () => {
  return {
    success: notificationService.success.bind(notificationService),
    error: notificationService.error.bind(notificationService),
    warning: notificationService.warning.bind(notificationService),
    info: notificationService.info.bind(notificationService),
    remove: notificationService.remove.bind(notificationService),
    clear: notificationService.clear.bind(notificationService),
    handleApiResponse:
      notificationService.handleApiResponse.bind(notificationService),
    handleApiError:
      notificationService.handleApiError.bind(notificationService),
  };
};
