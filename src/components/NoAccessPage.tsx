import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export const NoAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, getUserDisplayName, getUserEmail } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      // Force navigation to login even if logout fails
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Access Not Available
            </CardTitle>
            <CardDescription className="mt-2">
              You don't currently have access to any tenants or projects in this
              system.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900">Current User:</h3>
              <p className="text-sm text-gray-600">{getUserDisplayName()}</p>
              <p className="text-sm text-gray-500">{getUserEmail()}</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">What you can do:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Contact your system administrator to request access</li>
                <li>Verify you're using the correct account</li>
                <li>Check if your account has been properly configured</li>
              </ul>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                If you believe this is an error, please contact your
                administrator with your email address.
              </p>

              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Refresh Page
                </Button>

                <Button onClick={handleLogout} className="w-full">
                  Sign Out & Try Different Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
