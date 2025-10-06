import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { permissionService } from "../services/permissionService";
import { RoleService } from "../services/roleService";
import type { RoutePermission } from "../types";

interface ProtectedRouteProps extends RoutePermission {
  children: React.ReactNode;
  requiredRoles?: string[]; // Dynamic role names from backend
  requireAllRoles?: boolean; // If true, user must have ALL roles; if false, ANY role
  fallbackComponent?: React.ComponentType; // Custom component to show on access denied
  redirectTo?: string; // Custom redirect path on access denied
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requireAllRoles = false,
  permission,
  permissions,
  requireAll = false,
  fallbackComponent: FallbackComponent,
  redirectTo,
}) => {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const { user, isLoading, isFullyAuthenticated, meDataLoaded } = useAuth();
  const location = useLocation();

  // Get user's roles from Me data (hook-dependent, so call early)
  const meData = permissionService.getMeData();
  const userRoles = meData?.Roles || [];

  // Helper function to render access denied message
  const renderAccessDenied = (
    _title: string,
    _required: string[],
    type: "roles" | "permissions"
  ) => {
    // If custom fallback component provided, use it
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    // If custom redirect provided, use it
    if (redirectTo) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Default access denied component
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>

          {type === "roles" && requiredRoles && requiredRoles.length > 0 && (
            <div className="text-sm text-gray-500 mb-2">
              <p>
                Required roles ({requireAllRoles ? "ALL" : "ANY"}):{" "}
                {requiredRoles.join(", ")}
              </p>
              <p>
                Your roles:{" "}
                {RoleService.getRoleNames(userRoles).join(", ") || "None"}
              </p>
            </div>
          )}

          {type === "permissions" && (
            <div className="text-sm text-gray-500 mb-2">
              {permission && <p>Required permission: {permission}</p>}
              {permissions && permissions.length > 0 && (
                <p>
                  Required permissions ({requireAll ? "ALL" : "ANY"}):{" "}
                  {permissions.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // NOW we can do conditional returns after all hooks have been called
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

  // Check if we need to wait for ME data to load
  const savedTenantIdentifier = localStorage.getItem(
    "selectedTenantIdentifier"
  );
  const savedSelectionConfirmed = localStorage.getItem("selectionConfirmed");
  const hasPermissionRequirements =
    permission || (permissions && permissions.length > 0);

  // If user has saved selections and we need permissions, wait for ME data to load
  if (
    hasPermissionRequirements &&
    savedTenantIdentifier &&
    savedSelectionConfirmed === "true" &&
    !meDataLoaded
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <div className="mt-4 text-gray-600">Loading permissions...</div>
      </div>
    );
  }

  if (import.meta.env.DEV) {
    console.log("[ProtectedRoute] Permission check:", {
      path: location.pathname,
      permission,
      permissions,
      requireAll,
      meDataLoaded,
      hasMe: !!meData,
      userPermissions: permissionService.getUserPermissionNames(),
      userRoles: permissionService.getUserRoleNames(),
    });
  }

  // PRIORITIZE PERMISSION-BASED ACCESS CONTROL
  const requiredPerms = permission ? [permission] : permissions || [];

  // If permissions are specified, check them first (preferred approach)
  if (requiredPerms.length > 0) {
    // Use permission service for permission-based checking
    const hasPermissionAccess = permissionService.canAccessRoute({
      permission,
      permissions,
      requireAll,
    });

    if (!hasPermissionAccess) {
      return renderAccessDenied(
        "Insufficient Permissions",
        requiredPerms,
        "permissions"
      );
    }
  }
  // FALLBACK TO ROLE-BASED ACCESS CONTROL (for backward compatibility)
  else if (requiredRoles && requiredRoles.length > 0) {
    const hasRoleAccess = RoleService.hasRole(
      userRoles,
      requiredRoles,
      requireAllRoles
    );

    if (!hasRoleAccess) {
      return renderAccessDenied("Insufficient Roles", requiredRoles, "roles");
    }
  }

  return <>{children}</>;
};
