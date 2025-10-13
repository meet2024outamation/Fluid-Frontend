import { keysToCamelCase } from "../utils/camelCaseKeys";
import { notificationService } from "../services/notificationService";
import type {
  ApiResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../types";
// API Configuration
export const API_CONFIG = {
  // Use environment variable or fall back to relative URLs for development
  BASE_URL:
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "",

  // API endpoints
  ENDPOINTS: {
    TENANTS: "/api/tenants",
    TENANT_DETAILS: "/api/tenants/details", // New endpoint for fetching tenant details
    USERS: "/api/users",
    PROJECTS: "/api/projects",
    PROJECTS_BY_TENANT: "/api/projects/by-tenant", // Tenant-specific projects endpoint
    SCHEMAS: "/api/schemas",
    GLOBAL_SCHEMAS: "/api/global-schemas",
    BATCHES: "/api/batches",
    ORDERS: "/api/orders",
    ORDER_STATUSES: "/api/order-statuses",
    SCHEMA_ORDER: "/api/schema/order", // Schema fields for order keying
    FIELD_MAPPINGS: "/api/field-mappings",
    ROLES: "/api/roles",
    // Authentication endpoints
    AUTH: {
      LOGIN: "/api/auth/login",
      LOGOUT: "/api/auth/logout",
      REFRESH: "/api/auth/refresh",
      PROFILE: "/api/auth/profile",
    },
    // Specific nested endpoints
    PROJECTS_ASSIGN_SCHEMAS: "/api/projects/assign-schemas",
  },
} as const;

// Standardized API Error class
export class ApiError extends Error {
  public status: number;
  public data: ApiErrorResponse;
  public response: ApiResponse;

  constructor(message: string, status: number, response: ApiResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = {
      success: false,
      message: response.message,
      error: response.error,
      errors: response.errors,
      validationErrors: response.validationErrors,
      status,
    };
    this.response = response;
  }

  // Check if this is a validation error
  isValidationError(): boolean {
    return Boolean(
      this.status === 400 &&
        ((this.data?.validationErrors &&
          this.data.validationErrors.length > 0) ||
          (this.data?.errors &&
            typeof this.data.errors === "object" &&
            Object.keys(this.data.errors).length > 0))
    );
  }
}

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL;

  // If no base URL is configured, use relative URLs (for development with proxy)
  if (!baseUrl) {
    return endpoint;
  }

  // Remove leading slash from endpoint if base URL doesn't end with slash
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

// Helper function to get authentication headers (simplified; interceptor removed)
export const getAuthHeaders = (options?: {
  includeTenant?: boolean;
  includeProject?: boolean;
  overrideTenantIdentifier?: string | null;
  overrideProjectId?: string | number | null;
  omitAuth?: boolean; // allow calls without bearer (e.g., public endpoints if any)
}): Record<string, string> => {
  const token =
    localStorage.getItem("msal.access.token") ||
    sessionStorage.getItem("msal.access.token");

  const selectedTenantIdentifier =
    options?.overrideTenantIdentifier ??
    localStorage.getItem("selectedTenantIdentifier");

  const selectedProjectId =
    options?.overrideProjectId?.toString() ??
    localStorage.getItem("selectedProjectId");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!options?.omitAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options?.includeTenant !== false && selectedTenantIdentifier) {
    headers["x-tenant-id"] = selectedTenantIdentifier;
  }

  if (options?.includeProject === true && selectedProjectId) {
    headers["x-project-id"] = selectedProjectId;
  }

  return headers;
};

// Helper function for authenticated API calls
export const apiRequest = async (
  endpoint: string,
  options: RequestInit & {
    includeTenant?: boolean;
    includeProject?: boolean;
    overrideTenantIdentifier?: string | null;
    overrideProjectId?: string | number | null;
  } = {}
): Promise<Response> => {
  // Backward-compatible wrapper; uses direct fetch now
  const url = buildApiUrl(endpoint);

  let body = options.body;
  if (
    body &&
    typeof body === "string" &&
    (options.method === "POST" ||
      options.method === "PUT" ||
      options.method === "PATCH")
  ) {
    try {
      const parsed = JSON.parse(body);
      body = JSON.stringify(keysToCamelCase(parsed));
    } catch {
      /* ignore parse error */
    }
  }

  const {
    includeTenant,
    includeProject,
    overrideTenantIdentifier,
    overrideProjectId,
    headers,
    ...rest
  } = options as any;
  const authHeaders = getAuthHeaders({
    includeTenant,
    includeProject,
    overrideTenantIdentifier,
    overrideProjectId,
  });

  return fetch(url, {
    ...rest,
    headers: {
      ...authHeaders,
      ...(headers || {}),
    },
    body,
  });
};

// Enhanced API request that handles JSON responses and validation errors
export const apiRequestWithValidation = async (
  endpoint: string,
  options: RequestInit = {},
  formErrorSetter?: (
    field: string,
    error: { type: string; message: string }
  ) => void,
  fieldMapping?: Record<string, string>
): Promise<any> => {
  const response = await apiRequest(endpoint, options as any);

  // Handle response content
  let responseData: any;
  const contentType = response.headers.get("content-type");

  try {
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch (error) {
    responseData = null;
  }

  // Handle successful responses
  if (response.ok) {
    return responseData;
  }

  // Create API error with response details
  const apiError = new ApiError(
    responseData?.message ||
      response.statusText ||
      `API call failed with status ${response.status}`,
    response.status,
    responseData
  );

  // Handle 400 status with validation errors automatically
  if (response.status === 400 && responseData) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      message: responseData.message,
      errors: responseData.errors,
      validationErrors: responseData.validationErrors,
      status: response.status,
    };

    const fieldMap =
      fieldMapping || notificationService.createDefaultFieldMapping();
    notificationService.handleApiError(
      errorResponse,
      formErrorSetter,
      fieldMap
    );
  }

  throw apiError;
};

// Convenience function for JSON API calls with validation error handling
export const apiJsonRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  return apiRequestWithValidation(endpoint, options);
};

// Handle API response with notifications (for non-throwing scenarios)
export const handleApiResponse = <T>(response: ApiResponse<T>): T | null => {
  notificationService.handleApiResponse(response);

  if (response.success) {
    return response.data || null;
  }

  return null;
};

// Create standardized success response
export const createSuccessResponse = <T>(
  data?: T,
  message?: string
): ApiSuccessResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

// Create standardized error response
export const createErrorResponse = (
  message: string,
  errors?: any,
  validationErrors?: any[],
  status = 400
): ApiErrorResponse => {
  return {
    success: false,
    message,
    errors,
    validationErrors,
    status,
  };
};

// Helper functions for role detection based on accessible tenants data
export const getUserRoleFromAccessibleTenants = (): string | null => {
  try {
    // Try to get role from stored accessible tenants data
    const accessibleTenantsData = localStorage.getItem("accessibleTenants");
    if (!accessibleTenantsData) {
      // Fallback to checking current user context
      return null;
    }

    const parsedData = JSON.parse(accessibleTenantsData);

    // Priority order: Product Owner > Tenant Admin > Other
    if (parsedData.isProductOwner === true) {
      return "Product Owner";
    }

    if (
      parsedData.tenantAdminIds &&
      Array.isArray(parsedData.tenantAdminIds) &&
      parsedData.tenantAdminIds.length > 0
    ) {
      return "Tenant Admin";
    }

    // Default to other role (Keying, Member, etc.)
    return "Other";
  } catch (error) {
    console.error(
      "Error determining user role from accessible tenants:",
      error
    );
    return null;
  }
};

// Get headers for ME API endpoint based on user role and context requirements
// Role-based header rules:
// - Product Owner: No tenant/project headers (has global access)
// - Tenant Admin: Only x-tenant-id header (scoped to tenant)
// - Other roles (Keying, etc.): Both x-tenant-id and x-project-id headers (scoped to project)
export const getMeApiHeaders = (): Record<string, string> => {
  const userRole = getUserRoleFromAccessibleTenants();

  switch (userRole) {
    case "Product Owner":
      // Product Owner: No tenant/project headers required - has global access
      return getAuthHeaders({ includeTenant: false, includeProject: false });

    case "Tenant Admin":
      // Tenant Admin: Only x-tenant-id header - scoped to tenant level
      return getAuthHeaders({ includeTenant: true, includeProject: false });

    default:
      // Other roles (Keying, Member, etc.): Both headers - scoped to project level
      return getAuthHeaders({ includeTenant: true, includeProject: true });
  }
};

// Specialized API request for /me endpoint with role-aware headers and duplicate prevention
// This function automatically determines the user's role and applies the appropriate headers:
// - Detects user role from accessible tenants data
// - Applies role-specific header rules for context resolution
// - Prevents duplicate calls to /me endpoint
// - Enables backend to return correct permissions and context information
export const meApiRequest = async (options?: {
  // pass explicit context overrides if needed (for freshly selected tenant/project)
  tenantIdentifier?: string | null;
  projectId?: string | number | null;
}): Promise<Response> => {
  const meEndpoint = "/api/users/me";

  const userRole = getUserRoleFromAccessibleTenants();

  // Determine which context headers to include based on role
  let includeTenant = true;
  let includeProject = true;
  switch (userRole) {
    case "Product Owner":
      includeTenant = false;
      includeProject = false;
      break;
    case "Tenant Admin":
      includeTenant = true;
      includeProject = false;
      break;
    default:
      includeTenant = true;
      includeProject = true;
  }

  return apiRequest(meEndpoint, {
    method: "GET",
    includeTenant,
    includeProject,
    overrideTenantIdentifier: options?.tenantIdentifier ?? null,
    overrideProjectId: options?.projectId ?? null,
  });
};

// Temporary alias to fix import error - will be removed once source is found
export const apiAutoRequest = apiRequest;
