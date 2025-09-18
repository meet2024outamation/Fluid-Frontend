import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserPrimaryRole } from "../config/navigation";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export const LoginPage: React.FC = () => {
  const { user, login, isLoading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already authenticated
  if (user && !isLoading) {
    // Role-based redirection
    const primaryRole = getUserPrimaryRole(user);
    switch (primaryRole) {
      case "Product Owner":
        return <Navigate to="/dashboard" replace />;
      case "Tenant Owner":
        return <Navigate to="/batches" replace />;
      case "Operator":
        return <Navigate to="/operator" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
    } catch (error) {
      console.error("Login failed:", error);
      // Handle login error (show notification, etc.)
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Fluid System
          </h1>
          <p className="text-gray-600">
            Document Processing & Management Platform
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in with your Microsoft work account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-3"
              >
                {isLoggingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M23.64 12.2c0-.74-.07-1.44-.19-2.12H12.16v4.01h6.46c-.28 1.5-1.13 2.78-2.4 3.63v3.01h3.89c2.27-2.09 3.58-5.17 3.58-8.81z" />
                      <path d="M12.16 23.4c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.01c-1.07.72-2.44 1.14-4.04 1.14-3.11 0-5.74-2.1-6.68-4.92H1.51v3.09c1.97 3.91 6.02 6.61 10.65 6.61z" />
                      <path d="M5.48 14.7c-.24-.72-.37-1.49-.37-2.3s.13-1.58.37-2.3V6.99H1.51C.55 8.91 0 11.19 0 12.4s.55 3.49 1.51 5.41l3.97-3.1z" />
                      <path d="M12.16 4.8c1.75 0 3.32.6 4.55 1.78l3.42-3.42C18.11 1.19 15.4 0 12.16 0 7.53 0 3.48 2.7 1.51 6.61l3.97 3.09c.94-2.82 3.57-4.9 6.68-4.9z" />
                    </svg>
                    <span>Sign in with Microsoft</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          <p>Powered by Azure Active Directory</p>
          <p className="mt-1">Secure • Modern • Accessible</p>
        </div>
      </div>
    </div>
  );
};
