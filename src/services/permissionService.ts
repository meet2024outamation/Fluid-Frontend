import type {
  User,
  UserMeResponse,
  PermissionInfo,
  UserRoleInfo,
  RoutePermission,
} from "../types";
import { expandLegacyManage } from "../config/permissions";

interface CurrentContext {
  tenantId?: string;
  tenantName?: string;
  projectId?: number;
  projectName?: string;
}

class PermissionService {
  private user: User | null = null;
  private meData: UserMeResponse | null = null;
  private permissions: PermissionInfo[] = [];
  private roles: UserRoleInfo[] = [];
  private currentContext: CurrentContext = {};
  private normalizedPermissionSet: Set<string> = new Set();
  private normalizedRoleSet: Set<string> = new Set();

  private normalizeKey(value: string | undefined | null): string {
    return (value || "").trim().toLowerCase();
  }

  // Set user data from Me API
  setMeData(meData: UserMeResponse | null) {
    this.meData = meData as any;

    if (meData) {
      // Normalize casing (supports camelCase or PascalCase)
      const norm = meData as any;
      let roles = norm.Roles || norm.roles || [];
      const permissions = norm.Permissions || norm.permissions || [];

      this.permissions = permissions;
      // Normalize role objects: if roleName present but Name missing, copy it
      roles = roles.map((r: any) => {
        if (r && !r.Name && r.roleName) {
          return { ...r, Name: r.roleName };
        }
        return r;
      });
      this.roles = roles;

      // Build fast lookup sets (case-insensitive)
      this.permissions = permissions;
      this.roles = roles;

      // Backward compatibility: expand legacy ManageX permissions into synthetic CRUD permissions
      const synthetic: PermissionInfo[] = [];
      for (const p of this.permissions) {
        const name = (p as any).Name || (p as any).name;
        if (name && name.startsWith("Manage")) {
          const expansions = expandLegacyManage(name);
          for (const ex of expansions) {
            // Avoid duplicates if already present from backend
            const exists =
              this.permissions.some((pp: any) => (pp.Name || pp.name) === ex) ||
              synthetic.some((sp: any) => (sp.Name || sp.name) === ex);
            if (!exists) {
              synthetic.push({ Id: 0 as any, Name: ex } as PermissionInfo);
            }
          }
        }
      }
      if (synthetic.length) {
        this.permissions = [...this.permissions, ...synthetic];
      }

      // Build fast lookup sets (case-insensitive) including synthetic
      this.normalizedPermissionSet = new Set(
        this.permissions.map((p: any) => this.normalizeKey(p.Name || p.name))
      );
      this.normalizedRoleSet = new Set(
        this.roles.map((r: any) =>
          this.normalizeKey(r.Name || r.name || r.roleName)
        )
      );

      // If no roles returned but permissions suggest capabilities, infer a role for display
      if (!this.roles.length) {
        const permNames = this.getUserPermissionNames();
        const hasTenantPerms = permNames.some((p) => /Tenants$/.test(p));
        const hasProjectPerms = permNames.some((p) => /Projects$/.test(p));
        if (hasTenantPerms) {
          this.roles = [{ Id: 0 as any, Name: "Product Owner" } as any];
        } else if (hasProjectPerms) {
          this.roles = [{ Id: 0 as any, Name: "Tenant Admin" } as any];
        }
        if (this.roles.length) {
          this.normalizedRoleSet = new Set(
            this.roles.map((r: any) => this.normalizeKey(r.Name))
          );
        }
      }

      this.currentContext = {
        tenantId: norm.CurrentTenantId || norm.currentTenantId,
        tenantName: norm.CurrentTenantName || norm.currentTenantName,
        projectId: norm.CurrentProjectId || norm.currentProjectId,
        projectName: norm.CurrentProjectName || norm.currentProjectName,
      };

      this.user = {
        id: norm.Id || norm.id,
        email: norm.Email || norm.email || "",
        firstName: norm.FirstName || norm.firstName || "",
        lastName: norm.LastName || norm.lastName || "",
        phone: norm.Phone || norm.phone || "",
        isActive:
          (norm.IsActive !== undefined ? norm.IsActive : norm.isActive) ?? true,
        roles: roles.map((role: any) => ({
          tenantId: null,
          projectId: null,
          roleId: role.Id || role.id || role.roleId,
          roleName: role.Name || role.name || role.roleName,
          permissions:
            (role.Permissions || role.permissions || []).map(
              (p: any) => p.Name || p.name
            ) || [],
        })),
        permissions: permissions.map((p: any) => ({
          id: p.Id || p.id,
          name: p.Name || p.name,
        })),
        createdAt: new Date(norm.CreatedAt || norm.createdAt || Date.now()),
        updatedAt: norm.UpdatedAt
          ? new Date(norm.UpdatedAt)
          : norm.updatedAt
            ? new Date(norm.updatedAt)
            : undefined,
      };
    } else {
      this.clearData();
    }
  }

  // Legacy method for backward compatibility
  setUser(user: User | null) {
    this.user = user;
    if (!this.meData && user) {
      // If we only have legacy user data, extract what we can
      this.permissions =
        user.permissions?.map((p) => ({
          Id: p.id,
          Name: p.name,
          Description: p.resource ? `${p.action} on ${p.resource}` : undefined,
        })) || [];
    }
  }

  private clearData() {
    this.user = null;
    this.meData = null;
    this.permissions = [];
    this.roles = [];
    this.currentContext = {};
    this.normalizedPermissionSet.clear();
    this.normalizedRoleSet.clear();
  }

  // Get current user
  getUser(): User | null {
    return this.user;
  }

  // Get Me API data
  getMeData(): UserMeResponse | null {
    return this.meData;
  }

  // Get current context
  getCurrentContext(): CurrentContext {
    return { ...this.currentContext };
  }

  // Permission checking methods
  hasPermission(permissionName: string): boolean {
    if (!permissionName) return false;
    const norm = this.normalizeKey(permissionName);
    if (this.normalizedPermissionSet.has(norm)) return true;
    // Fallback scan (covers mixed structures Name/name)
    return this.permissions.some(
      (p: any) =>
        p.Name === permissionName ||
        p.name === permissionName ||
        this.normalizeKey(p.Name || p.name) === norm
    );
  }

  hasAnyPermission(permissionNames: string[]): boolean {
    return permissionNames.some((name) => this.hasPermission(name));
  }

  hasAllPermissions(permissionNames: string[]): boolean {
    return permissionNames.every((name) => this.hasPermission(name));
  }

  // Role checking methods
  hasRole(roleName: string): boolean {
    if (!roleName) return false;
    const norm = this.normalizeKey(roleName);
    if (this.normalizedRoleSet.has(norm)) return true;
    return this.roles.some(
      (r: any) =>
        r.Name === roleName ||
        r.name === roleName ||
        this.normalizeKey(r.Name || r.name) === norm
    );
  }

  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some((name) => this.hasRole(name));
  }

  hasAllRoles(roleNames: string[]): boolean {
    return roleNames.every((name) => this.hasRole(name));
  }

  // Get all permissions
  getPermissions(): PermissionInfo[] {
    return [...this.permissions];
  }

  // Get all roles
  getRoles(): UserRoleInfo[] {
    return [...this.roles];
  }

  // Get permissions by names
  getPermissionsByNames(names: string[]): PermissionInfo[] {
    const normalizedNames = names.map((n) => this.normalizeKey(n));
    return this.permissions.filter((p: any) =>
      normalizedNames.includes(this.normalizeKey(p.Name || p.name))
    );
  }

  // Check route access based on configuration
  canAccessRoute(
    config: RoutePermission & {
      roles?: string[];
      requireAllRoles?: boolean;
    }
  ): boolean {
    // Check role requirements
    if (config.roles && config.roles.length > 0) {
      const hasRoleAccess = config.requireAllRoles
        ? this.hasAllRoles(config.roles)
        : this.hasAnyRole(config.roles);

      if (!hasRoleAccess) return false;
    }

    // Check single permission
    if (config.permission) {
      return this.hasPermission(config.permission);
    }

    // Check multiple permissions
    if (config.permissions && config.permissions.length > 0) {
      return config.requireAll
        ? this.hasAllPermissions(config.permissions)
        : this.hasAnyPermission(config.permissions);
    }

    // If no specific requirements, allow access
    return true;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.user !== null || this.meData !== null;
  }

  // Get user display name
  getUserDisplayName(): string {
    if (this.meData) {
      const firstName = this.meData.FirstName || "";
      const lastName = this.meData.LastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || this.meData.Email || "Unknown User";
    }

    if (this.user) {
      const firstName = this.user.firstName || "";
      const lastName = this.user.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || this.user.email || "Unknown User";
    }

    return "Unknown User";
  }

  // Get user first name
  getFirstName(): string {
    return this.meData?.FirstName || this.user?.firstName || "";
  }

  // Get user last name
  getLastName(): string {
    return this.meData?.LastName || this.user?.lastName || "";
  }

  // Get user roles as string array
  getUserRoleNames(): string[] {
    return this.roles.map((r: any) => r.Name || (r as any).name);
  }

  // Get user permissions as string array
  getUserPermissionNames(): string[] {
    return this.permissions.map((p: any) => p.Name || p.name);
  }

  // Get user email
  getUserEmail(): string {
    return this.meData?.Email || this.user?.email || "";
  }

  // Context-specific permission checking
  hasPermissionInContext(
    permissionName: string,
    context?: Partial<CurrentContext>
  ): boolean {
    // For now, just check if user has the permission
    // This can be extended to check context-specific permissions
    const hasBasicPermission = this.hasPermission(permissionName);

    if (!context) return hasBasicPermission;

    // If context is specified, ensure current context matches
    if (context.tenantId && context.tenantId !== this.currentContext.tenantId) {
      return false;
    }

    if (
      context.projectId &&
      context.projectId !== this.currentContext.projectId
    ) {
      return false;
    }

    return hasBasicPermission;
  }

  // Check if user has admin access in current context
  isAdminInCurrentContext(): boolean {
    return this.hasAnyPermission([
      "UpdateUsers",
      "DeleteUsers",
      "UpdateRoles",
      "DeleteRoles",
      "UpdateTenants",
      "DeleteTenants",
      "UpdateProjects",
      "DeleteProjects",
      // Backward compatibility
      "ManageUsers",
      "ManageRoles",
      "ManageTenants",
      "ManageProjects",
    ]);
  }

  // Check if user is product owner (permission-based approach preferred)
  isProductOwner(): boolean {
    // New CRUD model: Product Owner if can update OR delete tenants (administrative control)
    if (
      this.hasAnyPermission(["UpdateTenants", "DeleteTenants", "CreateTenants"])
    )
      return true;
    // Backward compatibility
    if (this.hasPermission("ManageTenants")) return true;
    // Fallback to role-based check for backward compatibility
    return this.hasRole("Product Owner");
  }

  // Check if user is tenant admin (permission-based approach preferred)
  isTenantAdmin(): boolean {
    // New CRUD heuristic: Can modify projects but not tenants
    const projectPower = this.hasAnyPermission([
      "UpdateProjects",
      "DeleteProjects",
      "CreateProjects",
    ]);
    const tenantPower =
      this.hasAnyPermission([
        "UpdateTenants",
        "DeleteTenants",
        "CreateTenants",
      ]) || this.hasPermission("ManageTenants");
    if (projectPower && !tenantPower) return true;
    // Backward compatibility path
    if (
      this.hasPermission("ManageProjects") &&
      !this.hasPermission("ManageTenants")
    )
      return true;
    // Fallback to role-based check for backward compatibility
    return this.hasRole("Tenant Admin");
  }

  // Get permissions for debugging
  debug(): {
    user: User | null;
    meData: UserMeResponse | null;
    permissions: string[];
    roles: string[];
    context: CurrentContext;
    userDisplayName: string;
  } {
    return {
      user: this.user,
      meData: this.meData,
      permissions: this.getUserPermissionNames(),
      roles: this.getUserRoleNames(),
      context: this.currentContext,
      userDisplayName: this.getUserDisplayName(),
    };
  }

  // Log debug information to console (only used by debug panel)
  logDebugInfo(): void {
    if (import.meta.env.DEV) {
      console.log("Permission Service Debug Info:", this.debug());
    }
  }
}

// Create singleton instance
export const permissionService = new PermissionService();
export default permissionService;
