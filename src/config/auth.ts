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

// Login request configuration
export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "openid", "profile"],
  prompt: "select_account",
};

// Graph API scopes
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphUsersEndpoint: "https://graph.microsoft.com/v1.0/users",
};

// Role mapping configuration
export const roleMapping = {
  admin: ["Admin", "Global Administrator", "Application Administrator"],
  manager: ["Manager", "Team Lead", "Supervisor"],
  operator: ["Operator", "Data Entry", "User"],
};

// Default role for new users
export const defaultRole = "Operator";
