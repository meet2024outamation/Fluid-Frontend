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
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();

        // Check if user is already logged in
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const account = accounts[0];
          await loadUserFromBackend(account);
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

      // Store token for API calls
      localStorage.setItem("msal.access.token", accessToken);

      // Get user email from Azure AD account
      const userEmail = account.username;

      // First, try to find user by email to get their ID
      const userLookupResponse = await fetch(
        buildApiUrl(`${userApiEndpoints.getUserByEmail}/${encodeURIComponent(userEmail)}`),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (userLookupResponse.ok) {
        const userData = await userLookupResponse.json();
        
        // Now fetch full user profile with roles using the user ID
        const profileResponse = await fetch(
          buildApiUrl(userApiEndpoints.getUserById(userData.id)),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (profileResponse.ok) {
          const backendUser = await profileResponse.json();

          // Transform backend user response to our User interface
          const appUser: User = {
            id: backendUser.id,
            email: backendUser.email,
            firstName: backendUser.firstName,
            lastName: backendUser.lastName,
            phone: backendUser.phone || "",
            isActive: backendUser.isActive,
            roles: backendUser.roles || [],
            createdAt: new Date(backendUser.createdAt),
            updatedAt: backendUser.updatedAt
              ? new Date(backendUser.updatedAt)
              : new Date(),
          };

          setUser(appUser);
        } else {
          throw new Error(
            `Failed to fetch user profile: ${profileResponse.statusText}`
          );
        }
      } else if (userLookupResponse.status === 404) {
        // User doesn't exist in backend, create user profile from Azure AD
        await createUserInBackend(account, accessToken);
      } else {
        throw new Error(
          `Failed to lookup user: ${userLookupResponse.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to load user from backend:", error);
      // If backend fails, we might want to logout or show an error
      await logout();
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
          const newUser = await createUserResponse.json();

          const appUser: User = {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            phone: newUser.phone || "",
            isActive: newUser.isActive,
            roles: newUser.roles || [],
            createdAt: new Date(newUser.createdAt),
            updatedAt: new Date(),
          };

          setUser(appUser);
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
          const response = await msalInstance.acquireTokenPopup({
            ...apiTokenRequest,
            account: account,
          });
          return response.accessToken;
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

      const loginResponse = await msalInstance.loginPopup(loginRequest);

      if (loginResponse.account) {
        await loadUserFromBackend(loginResponse.account);
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear local storage
      localStorage.removeItem("msal.access.token");
      sessionStorage.removeItem("msal.access.token");

      // Clear user state
      setUser(null);

      // Logout from MSAL
      await msalInstance.logoutPopup();

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
    isLoading,
    login,
    logout,
    getAccessToken,
    refreshUserProfile,
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
