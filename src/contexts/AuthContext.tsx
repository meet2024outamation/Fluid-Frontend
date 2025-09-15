import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, UserRole } from "../types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Mock users for testing different roles
const mockUsers: Record<string, User> = {
  admin: {
    id: "mock-admin-1",
    name: "John Admin",
    email: "admin@fluidcorp.com",
    role: "Admin",
  },
  manager: {
    id: "mock-manager-1",
    name: "Sarah Manager",
    email: "manager@fluidcorp.com",
    role: "Manager",
  },
  operator: {
    id: "mock-operator-1",
    name: "Mike Operator",
    email: "operator@fluidcorp.com",
    role: "Operator",
  },
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and check for existing session
    const initializeAuth = () => {
      setTimeout(() => {
        // Check localStorage for existing mock session
        const savedUser = localStorage.getItem("mockUser");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (error) {
            console.error("Failed to parse saved user:", error);
            localStorage.removeItem("mockUser");
          }
        }
        setIsLoading(false);
      }, 500); // Simulate loading time
    };

    initializeAuth();
  }, []);

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo purposes, cycle through different roles
      // In a real app, you might show a role selector or use a fixed role
      const userKeys = Object.keys(mockUsers);
      const currentUserKey = "admin";

      let nextUserKey: string;
      //   const currentIndex = userKeys.indexOf(currentUserKey);
      //   if (currentIndex === -1 || currentIndex === userKeys.length - 1) {
      //     nextUserKey = userKeys[0];
      //   } else {
      //     nextUserKey = userKeys[currentIndex + 1];
      //   }

      const selectedUser = mockUsers[currentUserKey];

      // Save to localStorage to persist across page reloads
      localStorage.setItem("mockUser", JSON.stringify(selectedUser));
      localStorage.setItem("mockUserRole", currentUserKey);

      setUser(selectedUser);

      console.log(`Logged in as ${selectedUser.name} (${selectedUser.role})`);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear stored session
      localStorage.removeItem("mockUser");
      localStorage.removeItem("mockUserRole");
      setUser(null);
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    // Return a mock token for API calls
    if (user) {
      return `mock-token-${user.id}-${Date.now()}`;
    }
    return null;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getAccessToken,
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
