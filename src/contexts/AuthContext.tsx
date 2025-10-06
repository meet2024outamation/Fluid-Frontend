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
import type {
  User,
  AccessibleTenantsResponse,
  UserMeResponse,
  CurrentUser,
} from "../types";
// Removed role constants import - using string literals now
import { authService } from "../services/authService";
import { permissionService } from "../services/permissionService";

interface AuthContextType {
  user: User | null;
  currentUser: CurrentUser | null; // New CurrentUser format
  accessibleTenants: AccessibleTenantsResponse | null;
  meData: UserMeResponse | null;
  roles: string[]; // normalized role names from permissionService
  permissions: string[]; // normalized permission names from permissionService
  isAuthenticated: boolean;
  isFullyAuthenticated: boolean; // New property to track if user has completed sign-in flow
  isLoading: boolean;
  meDataLoaded: boolean; // Track if ME API data has been loaded
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshUserProfile: () => Promise<void>;
  fetchMeData: () => Promise<void>; // New method to fetch Me API data
  updateUserContext: (tenantId?: string, projectId?: number) => Promise<void>; // Update context
  setAccessibleTenants: (tenants: AccessibleTenantsResponse) => void;
  // Permission methods (delegated to permission service)
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccessRoute: (config: {
    roles?: string[];
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
  }) => boolean;
  // User information methods
  getUserDisplayName: () => string;
  getUserEmail: () => string;
  getUserRoles: () => string[];
  getUserPermissions: () => string[];
  // Debug methods
  debugPermissions: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Initialize MSAL instance (singleton)
export const msalInstance = new PublicClientApplication(msalConfig);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessibleTenants, setAccessibleTenants] =
    useState<AccessibleTenantsResponse | null>(null);
  const [meData, setMeData] = useState<UserMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullyAuthenticated, setIsFullyAuthenticated] = useState(false);
  const [meDataLoaded, setMeDataLoaded] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
          msalInstance.setActiveAccount(response.account);
        } else {
          const currentAccounts = msalInstance.getAllAccounts();
          if (currentAccounts.length > 0) {
            msalInstance.setActiveAccount(currentAccounts[0]);
          }
        }
        const activeAccount = msalInstance.getActiveAccount();
        if (activeAccount) {
          // Try to get token silently and load user
          try {
            const tokenResponse = await msalInstance.acquireTokenSilent({
              ...apiTokenRequest,
              account: activeAccount,
            });
            await loadUserFromBackendWithToken(
              activeAccount,
              tokenResponse.accessToken
            );
          } catch (tokenError) {
            // fallback: just set minimal user
            const minimalUser: User = {
              id: 0,
              email: activeAccount.username,
              firstName: activeAccount.name?.split(" ")[0] || "",
              lastName: activeAccount.name?.split(" ").slice(1).join(" ") || "",
              phone: "",
              isActive: true,
              roles: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            setUser(minimalUser);
            authService.setUser(minimalUser);
          }
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

      // Step 1: Call accessible-tenants API immediately after login
      const accessibleTenantsData =
        await authService.fetchAccessibleTenants(accessToken);

      if (accessibleTenantsData) {
        // Store accessible tenants data
        setAccessibleTenants(accessibleTenantsData);

        // Create minimal user from accessible tenants data
        const minimalUser: User = {
          id: accessibleTenantsData.userId,
          email: accessibleTenantsData.email,
          firstName: accessibleTenantsData.userName?.split(" ")[0] || "",
          lastName:
            accessibleTenantsData.userName?.split(" ").slice(1).join(" ") || "",
          phone: "",
          isActive: true,
          roles: [], // Will be filled when ME API is called after tenant/project selection
          permissions: [], // Will be filled when ME API is called after tenant/project selection
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setUser(minimalUser);
        authService.setUser(minimalUser);

        // Step 2: Check if user is Product Owner - if so, call ME API immediately without tenant/project headers
        if (accessibleTenantsData.isProductOwner) {
          try {
            const meResponse = await authService.fetchMeData(accessToken, {
              tenantIdentifier: null,
              projectId: null,
            });
            if (meResponse) {
              // Map ME API response to User object for Product Owner
              const productOwnerUser: User = {
                id: meResponse.Id,
                email: meResponse.Email,
                firstName: meResponse.FirstName || "",
                lastName: meResponse.LastName || "",
                phone: meResponse.Phone || "",
                isActive: meResponse.IsActive,
                roles: (meResponse.Roles || []).map((role) => ({
                  tenantId: null,
                  projectId: null,
                  roleId: role.Id,
                  roleName: role.Name,
                  permissions: role.Permissions?.map((p) => p.Name) || [],
                })),
                permissions: (meResponse.Permissions || []).map(
                  (permission) => ({
                    id: permission.Id,
                    name: permission.Name,
                    resource: permission.Description || undefined,
                  })
                ),
                createdAt: new Date(meResponse.CreatedAt),
                updatedAt: meResponse.UpdatedAt
                  ? new Date(meResponse.UpdatedAt)
                  : new Date(),
              };

              setUser(productOwnerUser);
              authService.setUser(productOwnerUser);
              setMeData(meResponse);
              setMeDataLoaded(true);

              // Update permission service with ME data as single source of truth
              permissionService.setMeData(meResponse);
            }
          } catch (meError) {
            console.warn(
              "ME API failed for Product Owner, will use minimal user:",
              meError
            );
            // Product Owner can still access the system with basic info from accessible-tenants
          }
        } else {
          // Step 3: For non-Product Owners, check if there's a saved tenant selection from previous session
          const savedTenantIdentifier = localStorage.getItem("selectedTenantIdentifier");
          const savedProjectId = localStorage.getItem("selectedProjectId");
          const savedSelectionConfirmed = localStorage.getItem("selectionConfirmed");
          
          // If user had previously selected a tenant and confirmed it, call ME API with that context
          if (savedTenantIdentifier && savedSelectionConfirmed === "true") {
            try {
              const projectId = savedProjectId ? parseInt(savedProjectId) : null;
              await authService.fetchMeData(accessToken, {
                tenantIdentifier: savedTenantIdentifier,
                projectId: projectId,
              });
              
              const meResponse = permissionService.getMeData();
              if (meResponse) {
                setMeData(meResponse);
                setMeDataLoaded(true);
                const updatedUser = permissionService.getUser();
                if (updatedUser) {
                  setUser(updatedUser);
                  authService.setUser(updatedUser);
                }
              }
            } catch (meError) {
              console.warn(
                "ME API failed for non-Product Owner with saved context, user will need to re-select:",
                meError
              );
              // Clear saved selections if ME API fails
              localStorage.removeItem("selectedTenantIdentifier");
              localStorage.removeItem("selectedProjectId");
              localStorage.removeItem("selectionConfirmed");
            }
          }
        }

        setIsFullyAuthenticated(true); // Mark as fully authenticated after accessible tenants data load
      } else {
        throw new Error("Failed to fetch accessible tenants");
      }
    } catch (error) {
      console.error("Failed to load user from backend:", error);

      if ((error as Error).message === "User not found in system") {
        // Try to create user in backend
        try {
          await createUserInBackend(account, accessToken);
        } catch (createError) {
          console.error("Failed to create user in backend:", createError);
          // Fall back to minimal user
          const fallbackUser: User = {
            id: 0,
            email: account.username,
            firstName: account.name?.split(" ")[0] || "",
            lastName: account.name?.split(" ").slice(1).join(" ") || "",
            phone: "",
            isActive: true,
            roles: [],
            permissions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setUser(fallbackUser);
          setIsFullyAuthenticated(true);
        }
      } else {
        // Don't logout automatically - keep the user authenticated with basic info
        const minimalUser: User = {
          id: 0,
          email: account.username,
          firstName: account.name?.split(" ")[0] || "",
          lastName: account.name?.split(" ").slice(1).join(" ") || "",
          phone: "",
          isActive: true,
          roles: [],
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUser(minimalUser);
        setIsFullyAuthenticated(true); // Still mark as authenticated even if backend fails
      }
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
          const accessibleTenantsData =
            await authService.fetchAccessibleTenants(accessToken);

          if (accessibleTenantsData) {
            // Store accessible tenants data
            setAccessibleTenants(accessibleTenantsData);

            // Create user object from accessible tenants response
            const appUser: User = {
              id: accessibleTenantsData.userId,
              email: accessibleTenantsData.email,
              firstName: accessibleTenantsData.userName?.split(" ")[0] || "",
              lastName:
                accessibleTenantsData.userName?.split(" ").slice(1).join(" ") ||
                "",
              phone: "",
              isActive: true,
              roles: [], // Will be filled when ME API is called after tenant/project selection
              permissions: [], // Will be filled when ME API is called after tenant/project selection
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            setUser(appUser);
            authService.setUser(appUser);
            setIsFullyAuthenticated(true);
          } else {
            throw new Error(
              "Failed to fetch accessible tenants after user creation"
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
      localStorage.removeItem("selectedTenantIdentifier");
      localStorage.removeItem("selectedProjectId");
      localStorage.removeItem("selectionConfirmed");
      localStorage.removeItem("accessibleTenants");

      // Clear user state
      setUser(null);
      authService.setUser(null); // Clear authService
      authService.resetMeDataStatus(); // Reset ME data tracking
      setAccessibleTenants(null);
      setMeData(null);
      setMeDataLoaded(false);
      setIsFullyAuthenticated(false);

      // Logout from MSAL using redirect
      await msalInstance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + "/login",
      });
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

  // Fetch Me API data for permissions and context
  const fetchMeData = async (): Promise<void> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }

      const meResponse = await authService.fetchMeData(accessToken);
      if (meResponse) {
        setMeData(meResponse);
        setMeDataLoaded(true);

        // Update user from permission service for consistency
        const updatedUser = permissionService.getUser();
        if (updatedUser) {
          setUser(updatedUser);
          authService.setUser(updatedUser);
        }
      } else {
        // ME API returned null - this is expected in some cases
        // User will have basic functionality with accessible tenants data
      }
    } catch (error) {
      // ME API failed - user can still access tenant selection and basic features
      if (import.meta.env.DEV) {
        console.warn(
          "ME API failed, user will have limited functionality:",
          error
        );
      }
      // Don't throw - this is not critical for basic functionality
    }
  };

  // Update user context after tenant/project selection
  const updateUserContext = async (
    tenantIdentifier?: string,
    projectId?: number
  ): Promise<void> => {
    try {
      // Clear existing ME data locally
      setMeData(null);
      setMeDataLoaded(false);

      await authService.updateUserContext(tenantIdentifier, projectId);

      const updatedMe = permissionService.getMeData();
      if (updatedMe) {
        setMeData(updatedMe);
        setMeDataLoaded(true);
        const updatedUser = permissionService.getUser();
        if (updatedUser) {
          setUser(updatedUser);
          authService.setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error("Failed to update user context:", error);
    }
  };

  // Compute currentUser from AuthService
  const currentUser = React.useMemo(
    () => authService.getCurrentUser(),
    [user, meData]
  );

  const value: AuthContextType = {
    user,
    currentUser,
    meData,
    roles: permissionService.getUserRoleNames(),
    permissions: permissionService.getUserPermissionNames(),
    isAuthenticated: !!user,
    isFullyAuthenticated,
    isLoading,
    meDataLoaded,
    accessibleTenants,
    login,
    logout,
    getAccessToken,
    refreshUserProfile,
    fetchMeData,
    updateUserContext,
    setAccessibleTenants,
    // Permission methods (delegated to permission service)
    hasRole: permissionService.hasRole.bind(permissionService),
    hasPermission: permissionService.hasPermission.bind(permissionService),
    hasAnyPermission:
      permissionService.hasAnyPermission.bind(permissionService),
    hasAllPermissions:
      permissionService.hasAllPermissions.bind(permissionService),
    canAccessRoute: permissionService.canAccessRoute.bind(permissionService),
    // User information methods with fallbacks
    getUserDisplayName: () => {
      // Prioritize CurrentUser from ME API data
      if (currentUser?.name && currentUser.name.trim()) {
        return currentUser.name;
      }

      // Fallback to permission service display name
      const displayName = permissionService.getUserDisplayName();
      if (
        displayName &&
        displayName !== "Unknown User" &&
        displayName !== "Loading..."
      ) {
        return displayName;
      }

      // Fallback to user object if ME data not loaded yet
      if (user && (user.firstName || user.lastName)) {
        return `${user.firstName} ${user.lastName}`.trim() || user.email;
      }

      return displayName || "Loading...";
    },
    getUserEmail: permissionService.getUserEmail.bind(permissionService),
    getUserRoles: () => permissionService.getUserRoleNames(),
    getUserPermissions: () => permissionService.getUserPermissionNames(),
    // Debug methods
    debugPermissions: permissionService.logDebugInfo.bind(permissionService),
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
