import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
}) => {
  const {
    user,
    isLoading,
    isFullyAuthenticated,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !isFullyAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return fallback || null;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return fallback || null;
    }
  }

  return <>{children}</>;
};

// Higher-order component version
export const withPermission = (
  permission: string,
  fallback?: React.ReactNode
) => {
  return <T extends object>(Component: React.ComponentType<T>) => {
    const WrappedComponent = (props: T) => (
      <PermissionGuard permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    );

    WrappedComponent.displayName = `withPermission(${Component.displayName || Component.name})`;
    return WrappedComponent;
  };
};

// Higher-order component for multiple permissions
export const withPermissions = (
  permissions: string[],
  requireAll = false,
  fallback?: React.ReactNode
) => {
  return <T extends object>(Component: React.ComponentType<T>) => {
    const WrappedComponent = (props: T) => (
      <PermissionGuard
        permissions={permissions}
        requireAll={requireAll}
        fallback={fallback}
      >
        <Component {...props} />
      </PermissionGuard>
    );

    WrappedComponent.displayName = `withPermissions(${Component.displayName || Component.name})`;
    return WrappedComponent;
  };
};
