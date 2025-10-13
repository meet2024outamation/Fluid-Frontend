import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { useTenantSelection } from "../contexts/TenantSelectionContext";

export const DefaultRedirect: React.FC = () => {
  const { user, accessibleTenants, isLoading } = useAuth();
  const {
    isProductOwner,
    isTenantAdmin,
    needsProjectSelection,
    selectedTenantIdentifier,
    selectedProjectId,
    selectionConfirmed,
  } = useTenantSelection();

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // CRITICAL: Wait for accessible-tenants API to complete before making any redirect decisions
  if (!accessibleTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <div className="mt-4 text-gray-600">Loading user permissions...</div>
      </div>
    );
  }

  // 1. Product Owner: Direct access to dashboard (no tenant/project selection needed)
  if (isProductOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2. Check for no access (after Product Owner check)
  if (
    (!accessibleTenants.tenantAdminIds ||
      accessibleTenants.tenantAdminIds.length === 0) &&
    (!accessibleTenants.tenants || accessibleTenants.tenants.length === 0)
  ) {
    return <Navigate to="/no-access" replace />;
  }

  // 3. Tenant Admin: Requires tenant selection first
  if (isTenantAdmin) {
    if (!selectedTenantIdentifier || !selectionConfirmed) {
      return <Navigate to="/tenant-selection" replace />;
    }
    // After tenant selection, Tenant Admin goes to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Other roles (Operator, etc.): Require tenant selection first
  if (!selectedTenantIdentifier || !selectionConfirmed) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // 5. For other roles, check if project selection is needed
  if (needsProjectSelection && !selectedProjectId) {
    return <Navigate to="/project-selection" replace />;
  }

  // 6. After all selections are made, route to appropriate page
  if (selectedTenantIdentifier) {
    if (selectedProjectId) {
      // Has both tenant and project - go to orders page
      return <Navigate to="/orders" replace />;
    } else if (!needsProjectSelection) {
      // Has tenant but doesn't need project - go to orders page
      return <Navigate to="/orders" replace />;
    }
  }

  // 7. Fallback: If something unexpected happens, force tenant selection
  return <Navigate to="/tenant-selection" replace />;
};
