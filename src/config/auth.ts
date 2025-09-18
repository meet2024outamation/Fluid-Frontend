import type { Configuration, PopupRequest } from "@azure/msal-browser";

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
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Login request configuration with backend API scope
export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "openid", "profile", "email"],
  prompt: "select_account",
};

// API token request configuration
export const apiTokenRequest = {
  scopes: ["User.Read"], // Add your backend API scope here if needed
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
  refreshToken: "/api/auth/refresh",
};
