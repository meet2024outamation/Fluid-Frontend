import type { Configuration, RedirectRequest } from "@azure/msal-browser";

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "your-client-id-here",
    authority:
      import.meta.env.VITE_AZURE_AUTHORITY ||
      "https://login.microsoftonline.com/your-tenant-id",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // Persist tokens across refresh
    storeAuthStateInCookie: false,
  },
};

// Login request configuration with redirect flow
export const loginRequest: RedirectRequest = {
  scopes: [
    `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/info.read`, // Only backend API scope
    "openid",
    "profile",
    "email",
  ],
  prompt: "select_account",
};

// API token request configuration - Use same scope as login
export const apiTokenRequest = {
  scopes: [
    `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/info.read`, // Only backend API scope
  ],
};

// Graph API configuration
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphUsersEndpoint: "https://graph.microsoft.com/v1.0/users",
};

// Backend API endpoints for user management
export const userApiEndpoints = {
  getUserByEmail: "/api/users/email", // New endpoint to get user by email
  getUserById: (id: number) => `/api/users/${id}`, // Get user by ID
  createUser: "/api/users", // Create new user
  getAccessibleTenants: "/api/users/accessible-tenants", // Get accessible tenants
  authTest: "/api/auth/test", // Auth test endpoint
  refreshToken: "/api/auth/refresh",
};
