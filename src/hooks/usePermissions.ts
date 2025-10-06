import { useMemo } from "react";
import { permissionService } from "../services/permissionService";
import type { RoutePermission } from "../types";

interface PermissionHookConfig extends RoutePermission {
  roles?: string[];
  requireAllRoles?: boolean;
}

/**
 * Hook for checking user permissions
 * @param config Permission configuration
 * @returns Object with permission checking methods and current state
 */
export const usePermissions = (config?: PermissionHookConfig) => {
  const meData = permissionService.getMeData();
  const user = permissionService.getUser();
  const currentContext = permissionService.getCurrentContext();

  const permissionState = useMemo(() => {
    const isAuthenticated = permissionService.isAuthenticated();

    return {
      // Basic state
      isAuthenticated,
      user,
      meData,
      currentContext,

      // Permission arrays
      permissions: permissionService.getPermissions(),
      roles: permissionService.getRoles(),

      // User info
      displayName: permissionService.getUserDisplayName(),
      email: permissionService.getUserEmail(),

      // Context checks
      isProductOwner: permissionService.isProductOwner(),
      isTenantAdmin: permissionService.isTenantAdmin(),
      isAdminInCurrentContext: permissionService.isAdminInCurrentContext(),

      // Access check for provided config
      hasAccess: config ? permissionService.canAccessRoute(config) : true,
    };
  }, [meData, user, currentContext, config]);

  return {
    ...permissionState,

    // Direct permission methods
    hasPermission: permissionService.hasPermission.bind(permissionService),
    hasAnyPermission:
      permissionService.hasAnyPermission.bind(permissionService),
    hasAllPermissions:
      permissionService.hasAllPermissions.bind(permissionService),

    // Role methods
    hasRole: permissionService.hasRole.bind(permissionService),
    hasAnyRole: permissionService.hasAnyRole.bind(permissionService),
    hasAllRoles: permissionService.hasAllRoles.bind(permissionService),

    // Context-aware permission checking
    hasPermissionInContext:
      permissionService.hasPermissionInContext.bind(permissionService),

    // Route access checking
    canAccessRoute: permissionService.canAccessRoute.bind(permissionService),

    // Debugging
    debug: permissionService.debug.bind(permissionService),
  };
};

/**
 * Simple hook to check a single permission
 * @param permission Permission name to check
 * @returns Boolean indicating if user has the permission
 */
export const usePermission = (permission: string): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

/**
 * Hook to check multiple permissions
 * @param permissions Array of permission names to check
 * @param requireAll If true, user must have ALL permissions; if false, ANY permission
 * @returns Boolean indicating if user has the required permissions
 */
export const usePermissionCheck = (
  permissions: string[],
  requireAll = false
): boolean => {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();
  return requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);
};

/**
 * Hook to check user roles
 * @param roles Array of role names to check
 * @param requireAll If true, user must have ALL roles; if false, ANY role
 * @returns Boolean indicating if user has the required roles
 */
export const useRoleCheck = (roles: string[], requireAll = false): boolean => {
  const { hasAllRoles, hasAnyRole } = usePermissions();
  return requireAll ? hasAllRoles(roles) : hasAnyRole(roles);
};

export default usePermissions;
