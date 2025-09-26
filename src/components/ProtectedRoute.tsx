import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUserPrimaryRole } from "../config/navigation";
import { PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE } from "../config/roles";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
}) => {
  const { user, isLoading, isFullyAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !isFullyAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    requiredRoles &&
    !requiredRoles.includes(getUserPrimaryRole(user) as UserRole)
  ) {
    // Handle legacy Admin role as equivalent to Product Owner using constants
    const userRoleString = getUserPrimaryRole(user);
    const isAdminWithProductOwnerAccess =
      userRoleString === TENANT_ADMIN_ROLE &&
      requiredRoles.includes(PRODUCT_OWNER_ROLE);

    if (!isAdminWithProductOwnerAccess) {
      // Show access denied message instead of redirecting to prevent infinite loops
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Your role: {getUserPrimaryRole(user)}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Required roles: {requiredRoles.join(", ")}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
