import React, { createContext, useContext, useEffect, useState } from "react";
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import type { AccountInfo } from "@azure/msal-browser";
import {
  msalConfig,
  loginRequest,
  apiTokenRequest,
  userApiEndpoints,
} from "../config/auth";
import { buildApiUrl } from "../config/api";
import type { User, AccessibleTenantsResponse } from "../types";
import {
  PRODUCT_OWNER_ROLE,
  TENANT_ADMIN_ROLE,
  OPERATOR_ROLE,
} from "../config/roles";

interface AuthContextType {
  user: User | null;
  accessibleTenants: AccessibleTenantsResponse | null;
  isAuthenticated: boolean;
  isFullyAuthenticated: boolean; // New property to track if user has completed sign-in flow
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshUserProfile: () => Promise<void>;
  setAccessibleTenants: (tenants: AccessibleTenantsResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessibleTenants, setAccessibleTenants] =
    useState<AccessibleTenantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullyAuthenticated, setIsFullyAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();

        // Handle redirect response first (when returning from Microsoft login)
        const redirectResponse = await msalInstance.handleRedirectPromise();

        if (redirectResponse && redirectResponse.account) {
          // User just completed login via redirect, use the token from redirect response
          if (redirectResponse.accessToken) {
            // We already have the token from redirect, use it directly
            await loadUserFromBackendWithToken(
              redirectResponse.account,
              redirectResponse.accessToken
            );
          } else {
            // Fallback: load user data normally if no token in redirect response
            await loadUserFromBackend(redirectResponse.account);
          }
          return;
        }

        // Check if user is already logged in from previous session
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          // Just set the user as authenticated without making token requests
          const account = accounts[0];
          // Create a minimal user object from account info without API calls
          const minimalUser: User = {
            id: 0, // Temporary ID until we load from backend
            email: account.username,
            firstName: account.name?.split(" ")[0] || "",
            lastName: account.name?.split(" ").slice(1).join(" ") || "",
            phone: "",
            isActive: true,
            roles: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setUser(minimalUser);
        }
      } catch (error) {
        console.error("Authentication initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loadUserFromBackend = async (account: AccountInfo) => {
    try {
      // Get access token for API calls
      const accessToken = await getAccessTokenForAccount(account);
      if (!accessToken) {
        console.error("Failed to get access token");
        return;
      }

      await loadUserFromBackendWithToken(account, accessToken);
    } catch (error) {
      console.error("Failed to load user from backend:", error);
      // Don't logout automatically - keep the user authenticated with basic info
      // Set a minimal user object so they stay logged in
      const minimalUser: User = {
        id: 0,
        email: account.username,
        firstName: account.name?.split(" ")[0] || "",
        lastName: account.name?.split(" ").slice(1).join(" ") || "",
        phone: "",
        isActive: true,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUser(minimalUser);
      setIsFullyAuthenticated(true); // Still mark as authenticated even if backend fails
    }
  };

  const loadUserFromBackendWithToken = async (
    account: AccountInfo,
    accessToken: string
  ) => {
    try {
      // Store token for API calls
      localStorage.setItem("msal.access.token", accessToken);

      // Optional: Decode JWT to see claims (for debugging only)
      try {
        const tokenParts = accessToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("JWT payload:", payload); // Using the payload for debugging
        }
      } catch (e) {
        console.log("Could not decode token for debugging");
      }

      // Call accessible-tenants API directly
      const accessibleTenantsResponse = await fetch(
        buildApiUrl(userApiEndpoints.getAccessibleTenants),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (accessibleTenantsResponse.ok) {
        const accessibleTenantsData = await accessibleTenantsResponse.json();

        // Store accessible tenants data
        setAccessibleTenants(accessibleTenantsData);

        // The tenantAdminIds now contains full tenant objects, so no need for additional processing

        // Determine user roles based on accessible tenants data
        const userRoles: any[] = [];
        if (accessibleTenantsData.isProductOwner) {
          /* Lines 168-169 omitted */
        }
        if (accessibleTenantsData.tenantAdminIds?.length > 0) {
          /* Lines 171-172 omitted */
        }
        if (accessibleTenantsData.tenants?.length > 0) {
          /* Lines 174-175 omitted */
        }
        // Default to Operator if no specific roles
        if (userRoles.length === 0) {
          /* Lines 178-179 omitted */
        }
        if (accessibleTenantsData.isProductOwner) {
          userRoles.push({ roleId: 1, roleName: PRODUCT_OWNER_ROLE });
        }
        if (accessibleTenantsData.tenantAdminIds?.length > 0) {
          userRoles.push({ roleId: 2, roleName: TENANT_ADMIN_ROLE });
        }
        if (accessibleTenantsData.tenants?.length > 0) {
          userRoles.push({ roleId: 3, roleName: OPERATOR_ROLE });
        }
        // Default to Operator if no specific roles
        if (userRoles.length === 0) {
          userRoles.push({ roleId: 3, roleName: OPERATOR_ROLE });
        }

        // Create a user object from accessible tenants response
        const appUser: User = {
          id: accessibleTenantsData.userId,
          email: accessibleTenantsData.email,
          firstName: accessibleTenantsData.userName.split(" ")[0] || "",
          lastName:
            accessibleTenantsData.userName.split(" ").slice(1).join(" ") || "",
          phone: "",
          isActive: true,
          roles: userRoles, // Now populated with actual roles
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setUser(appUser);
        setIsFullyAuthenticated(true); // Mark as fully authenticated after backend data load
      } else if (accessibleTenantsResponse.status === 404) {
        // User doesn't exist in backend, create user profile from Azure AD
        await createUserInBackend(account, accessToken);
      } else {
        throw new Error(
          `Failed to fetch accessible tenants: ${accessibleTenantsResponse.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to load user from backend:", error);
      // Don't logout automatically - keep the user authenticated with basic info
      // Set a minimal user object so they stay logged in
      const minimalUser: User = {
        id: 0,
        email: account.username,
        firstName: account.name?.split(" ")[0] || "",
        lastName: account.name?.split(" ").slice(1).join(" ") || "",
        phone: "",
        isActive: true,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUser(minimalUser);
      setIsFullyAuthenticated(true); // Still mark as authenticated even if backend fails
    }
  };

  const createUserInBackend = async (
    account: AccountInfo,
    accessToken: string
  ) => {
    try {
      // Get user info from Microsoft Graph
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (graphResponse.ok) {
        const graphUser = await graphResponse.json();

        // Create user in backend
        const createUserResponse = await fetch(
          buildApiUrl(userApiEndpoints.createUser),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: graphUser.mail || graphUser.userPrincipalName,
              firstName: graphUser.givenName || "",
              lastName: graphUser.surname || "",
              phone: graphUser.businessPhones?.[0] || "",
              isActive: true,
              azureObjectId: account.homeAccountId,
            }),
          }
        );

        if (createUserResponse.ok) {
          // After creating user, call accessible-tenants API to get user data
          const accessibleTenantsResponse = await fetch(
            buildApiUrl(userApiEndpoints.getAccessibleTenants),
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (accessibleTenantsResponse.ok) {
            const accessibleTenantsData =
              await accessibleTenantsResponse.json();

            // Create user object from accessible tenants response
            const appUser: User = {
              id: accessibleTenantsData.userId,
              email: accessibleTenantsData.email,
              firstName: accessibleTenantsData.userName.split(" ")[0] || "",
              lastName:
                accessibleTenantsData.userName.split(" ").slice(1).join(" ") ||
                "",
              phone: "",
              isActive: true,
              roles: [], // We'll manage roles through the TenantSelectionContext
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            setUser(appUser);
          } else {
            throw new Error(
              `Failed to fetch accessible tenants after user creation: ${accessibleTenantsResponse.statusText}`
            );
          }
        } else {
          throw new Error(
            `Failed to create user in backend: ${createUserResponse.statusText}`
          );
        }
      }
    } catch (error) {
      console.error("Failed to create user in backend:", error);
      throw error;
    }
  };

  const getAccessTokenForAccount = async (
    account: AccountInfo
  ): Promise<string | null> => {
    try {
      const tokenRequest = {
        ...apiTokenRequest,
        account: account,
      };

      const response = await msalInstance.acquireTokenSilent(tokenRequest);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          // Use redirect instead of popup for token acquisition
          await msalInstance.acquireTokenRedirect({
            ...apiTokenRequest,
            account: account,
          });
          // Note: This will redirect away from the page
          // The token will be available when the page reloads
          return null;
        } catch (interactiveError) {
          console.error(
            "Interactive token acquisition failed:",
            interactiveError
          );
          return null;
        }
      }
      console.error("Token acquisition failed:", error);
      return null;
    }
  };

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Use redirect flow instead of popup to avoid COOP issues
      await msalInstance.loginRedirect(loginRequest);

      // Note: loginRedirect will redirect away from the page
      // The actual token handling will happen when the page loads after redirect
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear local storage
      localStorage.removeItem("msal.access.token");
      sessionStorage.removeItem("msal.access.token");

      // Clear user state
      setUser(null);
      setAccessibleTenants(null);
      setIsFullyAuthenticated(false);

      // Logout from MSAL using redirect
      await msalInstance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + "/login",
      });

      console.log("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        return null;
      }

      return await getAccessTokenForAccount(accounts[0]);
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      await loadUserFromBackend(accounts[0]);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isFullyAuthenticated,
    isLoading,
    accessibleTenants,
    login,
    logout,
    getAccessToken,
    refreshUserProfile,
    setAccessibleTenants,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
