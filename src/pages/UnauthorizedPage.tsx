import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { getUserPrimaryRole } from "../config/navigation";

interface UnauthorizedPageProps {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  message?: string;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  requiredPermission,
  requiredPermissions,
  requiredRoles,
  message,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const userRole = user ? getUserPrimaryRole(user) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>

        <p className="text-gray-600 mb-6">
          {message ||
            "You don't have permission to access this page or resource."}
        </p>

        {/* Permission Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Access Requirements:
          </h3>

          {requiredPermission && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>Required Permission:</strong> {requiredPermission}
            </div>
          )}

          {requiredPermissions && requiredPermissions.length > 0 && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>Required Permissions:</strong>{" "}
              {requiredPermissions.join(", ")}
            </div>
          )}

          {requiredRoles && requiredRoles.length > 0 && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>Required Roles:</strong> {requiredRoles.join(", ")}
            </div>
          )}

          {userRole && (
            <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
              <strong>Your Current Role:</strong> {userRole}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button onClick={handleGoHome} className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-6">
          If you believe you should have access to this resource, please contact
          your administrator.
        </p>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
