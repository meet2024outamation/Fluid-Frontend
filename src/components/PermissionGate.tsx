import React from "react";
import { usePermissions } from "../hooks/usePermissions";
import type { RoutePermission } from "../types";

interface PermissionGateProps extends RoutePermission {
  children: React.ReactNode;
  roles?: string[];
  requireAllRoles?: boolean;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  showFallback?: boolean; // If true, shows fallback on access denied; if false, renders nothing
}

/**
 * Component that conditionally renders children based on user permissions
 * Similar to Angular's structural directive *hasPermission
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  roles,
  requireAllRoles = false,
  fallback = null,
  loading = null,
  showFallback = false,
}) => {
  const permissionState = usePermissions({
    permission,
    permissions,
    requireAll,
    roles,
    requireAllRoles,
  });

  // Show loading state if provided
  if (!permissionState.isAuthenticated && loading) {
    return <>{loading}</>;
  }

  // Check if user has access
  if (permissionState.hasAccess) {
    return <>{children}</>;
  }

  // If no access and showFallback is true, show fallback
  if (showFallback && fallback) {
    return <>{fallback}</>;
  }

  // Default: render nothing
  return null;
};

/**
 * Simple permission gate that only checks a single permission
 */
export const HasPermission: React.FC<{
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ permission, children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      permission={permission}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

/**
 * Permission gate that checks multiple permissions
 */
export const HasAnyPermission: React.FC<{
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ permissions, children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      permissions={permissions}
      requireAll={false}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

/**
 * Permission gate that requires ALL specified permissions
 */
export const HasAllPermissions: React.FC<{
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ permissions, children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      permissions={permissions}
      requireAll={true}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

/**
 * Role-based permission gate
 */
export const HasRole: React.FC<{
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ role, children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      roles={[role]}
      requireAllRoles={true}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

/**
 * Multiple roles permission gate
 */
export const HasAnyRole: React.FC<{
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ roles, children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      roles={roles}
      requireAllRoles={false}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

/**
 * Admin access gate (combines common admin permissions)
 */
export const AdminOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      permissions={[
        // New CRUD-based admin indicators (ANY)
        "UpdateUsers",
        "DeleteUsers",
        "UpdateRoles",
        "DeleteRoles",
        "UpdateTenants",
        "DeleteTenants",
        "UpdateProjects",
        "DeleteProjects",
        // Backward compatibility (legacy Manage*) still works via permissionService expansion
        "ManageUsers",
        "ManageRoles",
        "ManageTenants",
        "ManageProjects",
      ]}
      requireAll={false} // User needs ANY of these permissions
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

/**
 * Product Owner only gate
 */
export const ProductOwnerOnly: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, fallback, showFallback = false }) => {
  return (
    <PermissionGate
      roles={["Product Owner"]}
      requireAllRoles={true}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGate>
  );
};

export default PermissionGate;
