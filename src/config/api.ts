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

// Helper function to get authentication headers
export const getAuthHeaders = (): Record<string, string> => {
  const token =
    localStorage.getItem("msal.access.token") ||
    sessionStorage.getItem("msal.access.token");

  const selectedTenantIdentifier = localStorage.getItem(
    "selectedTenantIdentifier"
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add tenant header if a tenant identifier is selected (using identifier value but same header name)
  if (selectedTenantIdentifier) {
    headers["X-Tenant-Id"] = selectedTenantIdentifier;
  }

  return headers;
};

// Helper function for authenticated API calls
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const authHeaders = getAuthHeaders();

  const config: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  // Handle authentication errors
  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    window.location.href = "/login";
    throw new Error("Authentication required");
  }

  return response;
};
