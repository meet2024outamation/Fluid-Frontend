import type { UserRole, UserRoleInfo } from "../types";

/**
 * Utility service for role and permission checking
 */
export class RoleService {
  /**
   * Check if user has required roles (works with both UserRole and UserRoleInfo)
   * @param userRoles Array of user's roles from backend (UserRole or UserRoleInfo)
   * @param requiredRoles Array of required role names
   * @param requireAll If true, user must have ALL roles; if false, ANY role
   * @returns Boolean indicating if user has required roles
   */
  static hasRole(
    userRoles: (UserRole | UserRoleInfo)[] = [],
    requiredRoles: string[] = [],
    requireAll: boolean = false
  ): boolean {
    if (!requiredRoles.length) return true;

    const roleNames = userRoles.map((r) =>
      "roleName" in r ? r.roleName : r.Name
    );

    return requireAll
      ? requiredRoles.every((r) => roleNames.includes(r))
      : requiredRoles.some((r) => roleNames.includes(r));
  }

  /**
   * Check if user has any of the specified roles
   * @param userRoles Array of user's roles from backend
   * @param requiredRoles Array of required role names
   * @returns Boolean indicating if user has any of the required roles
   */
  static hasAnyRole(
    userRoles: (UserRole | UserRoleInfo)[] = [],
    requiredRoles: string[] = []
  ): boolean {
    return this.hasRole(userRoles, requiredRoles, false);
  }

  /**
   * Check if user has all of the specified roles
   * @param userRoles Array of user's roles from backend
   * @param requiredRoles Array of required role names
   * @returns Boolean indicating if user has all of the required roles
   */
  static hasAllRoles(
    userRoles: (UserRole | UserRoleInfo)[] = [],
    requiredRoles: string[] = []
  ): boolean {
    return this.hasRole(userRoles, requiredRoles, true);
  }

  /**
   * Get user's role names as array
   * @param userRoles Array of user's roles from backend
   * @returns Array of role names
   */
  static getRoleNames(userRoles: (UserRole | UserRoleInfo)[] = []): string[] {
    return userRoles.map((r) => ("roleName" in r ? r.roleName : r.Name));
  }

  /**
   * Check if user has a specific role by name
   * @param userRoles Array of user's roles from backend
   * @param roleName Name of the role to check
   * @returns Boolean indicating if user has the role
   */
  static hasRoleName(
    userRoles: (UserRole | UserRoleInfo)[] = [],
    roleName: string
  ): boolean {
    return userRoles.some(
      (r) => ("roleName" in r ? r.roleName : r.Name) === roleName
    );
  }

  /**
   * Get user's primary role (first role or most important one)
   * @param userRoles Array of user's roles from backend
   * @returns Primary role name or null if no roles
   */
  static getPrimaryRole(
    userRoles: (UserRole | UserRoleInfo)[] = []
  ): string | null {
    if (!userRoles.length) return null;

    const roleNames = this.getRoleNames(userRoles);

    // Priority order for common roles (can be customized)
    const rolePriority = ["Product Owner", "Tenant Admin", "QC", "Keying"];

    // Find the highest priority role
    for (const priorityRole of rolePriority) {
      if (roleNames.includes(priorityRole)) {
        return priorityRole;
      }
    }

    // If no priority role found, return the first role
    return roleNames[0];
  }

  /**
   * Check if user is admin (has admin-like roles)
   * @param userRoles Array of user's roles from backend
   * @returns Boolean indicating if user has admin roles
   */
  static isAdmin(userRoles: (UserRole | UserRoleInfo)[] = []): boolean {
    const adminRoles = ["Product Owner", "Tenant Admin"];
    return this.hasAnyRole(userRoles, adminRoles);
  }

  /**
   * Check if user is product owner
   * @param userRoles Array of user's roles from backend
   * @returns Boolean indicating if user is product owner
   */
  static isProductOwner(userRoles: (UserRole | UserRoleInfo)[] = []): boolean {
    return this.hasRoleName(userRoles, "Product Owner");
  }

  /**
   * Check if user is tenant admin
   * @param userRoles Array of user's roles from backend
   * @returns Boolean indicating if user is tenant admin
   */
  static isTenantAdmin(userRoles: (UserRole | UserRoleInfo)[] = []): boolean {
    return this.hasRoleName(userRoles, "Tenant Admin");
  }
}

export default RoleService;
