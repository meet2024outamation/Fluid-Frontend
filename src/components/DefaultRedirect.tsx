import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTenantSelection } from "../contexts/TenantSelectionContext";

export const DefaultRedirect: React.FC = () => {
  const { user } = useAuth();
  const {
    isProductOwner,
    isTenantAdmin,
    needsTenantSelection,
    needsProjectSelection,
    selectedTenantIdentifier,
    selectedProjectId,
  } = useTenantSelection();

  console.log("🔄 DefaultRedirect - User data:", {
    user: user ? { id: user.id, email: user.email, roles: user.roles } : null,
    isProductOwner,
    isTenantAdmin,
    needsTenantSelection,
    needsProjectSelection,
    selectedTenantIdentifier,
    selectedProjectId,
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Product Owner - direct access to dashboard
  if (isProductOwner) {
    console.log("🔄 Redirecting to dashboard (Product Owner)");
    return <Navigate to="/dashboard" replace />;
  }

  // If user needs tenant selection
  if (needsTenantSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // If user needs project selection
  if (needsProjectSelection) {
    return <Navigate to="/project-selection" replace />;
  }

  // Tenant Admin with tenant selected - go to dashboard
  if (isTenantAdmin && selectedTenantIdentifier) {
    return <Navigate to="/dashboard" replace />;
  }

  // Project user with project selected - go to operator dashboard
  if (selectedProjectId) {
    return <Navigate to="/operator" replace />;
  }

  // Fallback - shouldn't reach here in normal flow
  return <Navigate to="/tenant-selection" replace />;
};
