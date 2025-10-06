import type {
  User,
  UserMeResponse,
  CurrentUser,
  AccessibleTenantsResponse,
} from "../types";
import { getUserPrimaryRole } from "../config/navigation";
import { meApiRequest } from "../config/api";
import { permissionService } from "./permissionService";

class AuthService {
  private user: User | null = null;
  private currentUser: CurrentUser | null = null;
  private userPermissions: string[] = [];
  private meDataFetched: boolean = false;
  private meInFlight: Promise<UserMeResponse | null> | null = null;
  private lastContextKey: string | null = null;

  setUser(user: User | null) {
    this.user = user;
    this.userPermissions = this.extractPermissions(user);
    // Sync with permission service for backward compatibility
    permissionService.setUser(user);
  }

  // Get current user in new format
  getCurrentUser(): CurrentUser | null {
    return this.currentUser;
  }

  // Check if ME data has been fetched to avoid duplicates
  isMeDataFetched(): boolean {
    return this.meDataFetched;
  }

  // Reset ME data fetch status (for logout, tenant changes, etc.)
  resetMeDataStatus(): void {
    this.meDataFetched = false;
    this.currentUser = null;
    this.meInFlight = null;
    this.lastContextKey = null;
  }

  // Handle context changes (tenant/project selection) that affect ME API response
  onContextChange(): void {
    this.meDataFetched = false;
    this.currentUser = null;
    this.meInFlight = null;
  }

  // Fetch accessible tenants after login
  async fetchAccessibleTenants(
    accessToken: string
  ): Promise<AccessibleTenantsResponse | null> {
    try {
      const { buildApiUrl } = await import("../config/api");
      const { userApiEndpoints } = await import("../config/auth");

      const response = await fetch(
        buildApiUrl(userApiEndpoints.getAccessibleTenants),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const accessibleTenantsData: AccessibleTenantsResponse =
          await response.json();

        // Store in localStorage for later use
        localStorage.setItem(
          "accessibleTenants",
          JSON.stringify(accessibleTenantsData)
        );

        return accessibleTenantsData;
      } else if (response.status === 404) {
        // User doesn't exist in backend
        throw new Error("User not found in system");
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch accessible tenants: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      console.error("Error fetching accessible tenants:", error);
      throw error;
    }
  }

  // Call Me API to get user permissions and context (with duplicate prevention)
  async fetchMeData(
    _accessToken?: string,
    opts?: {
      tenantIdentifier?: string | null;
      projectId?: string | number | null;
    }
  ): Promise<UserMeResponse | null> {
    try {
      const contextKey = `${opts?.tenantIdentifier ?? "_none"}|${opts?.projectId ?? "_none"}`;
      if (this.meDataFetched && this.lastContextKey === contextKey) {
        const existing = permissionService.getMeData();
        if (existing) return existing;
      }

      if (this.meInFlight && this.lastContextKey === contextKey) {
        return this.meInFlight;
      }

      this.lastContextKey = contextKey;
      this.meInFlight = (async () => {
        const response = await meApiRequest({
          tenantIdentifier: opts?.tenantIdentifier ?? null,
          projectId: opts?.projectId ?? null,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Unauthorized access");
          }
          const text = await response.text();
          throw new Error(`ME API error: ${response.status} - ${text}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(`ME API returned non-JSON response: ${contentType}`);
        }

        const meData: UserMeResponse = await response.json();

        this.currentUser = this.mapMeResponseToCurrentUser(meData);
        permissionService.setMeData(meData);
        this.user = permissionService.getUser();
        this.userPermissions = this.extractPermissions(this.user);
        this.meDataFetched = true;
        return meData;
      })();

      try {
        return await this.meInFlight;
      } finally {
        this.meInFlight = null; // allow subsequent calls if forced
      }
    } catch (error) {
      console.error("Error fetching Me data:", error);
      this.meInFlight = null;
      throw error;
    }
  }

  // Map UserMeResponse to CurrentUser format
  private mapMeResponseToCurrentUser(meData: UserMeResponse): CurrentUser {
    const m: any = meData as any;
    const roles = m.Roles || m.roles || [];
    const permissions = m.Permissions || m.permissions || [];
    const firstName = m.FirstName || m.firstName || "";
    const lastName = m.LastName || m.lastName || "";
    const email = m.Email || m.email || "";
    return {
      id: m.Id || m.id,
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim() || email,
      roles: roles.map((role: any) => ({
        roleId: role.Id || role.id,
        roleName: role.Name || role.name,
        description: role.Description || role.description,
      })),
      permissions: permissions.map((perm: any) => ({
        id: perm.Id || perm.id,
        name: perm.Name || perm.name,
        description: perm.Description || perm.description,
      })),
      currentTenantId: m.CurrentTenantId || m.currentTenantId,
      currentTenantName: m.CurrentTenantName || m.currentTenantName,
      currentProjectId:
        (m.CurrentProjectId || m.currentProjectId)?.toString() || null,
      currentProjectName: m.CurrentProjectName || m.currentProjectName,
    };
  }

  // Update user context after tenant/project selection
  async updateUserContext(
    tenantId?: string,
    projectId?: number,
    _accessToken?: string
  ): Promise<void> {
    // Force allow new ME data fetch for updated context
    this.meDataFetched = false;
    this.meInFlight = null;
    this.lastContextKey = null;
    await this.fetchMeData(undefined, {
      tenantIdentifier: tenantId ?? null,
      projectId: projectId ?? null,
    });
  }

  getUser(): User | null {
    return this.user;
  }

  private extractPermissions(user: User | null): string[] {
    if (!user) return [];

    const permissions: string[] = [];

    // Extract permissions from user.permissions field
    if (user.permissions) {
      permissions.push(...user.permissions.map((p) => p.name));
    }

    // Extract permissions from roles
    if (user.roles) {
      user.roles.forEach((role) => {
        if (role.permissions) {
          permissions.push(...role.permissions);
        }
      });
    }

    // Remove duplicates
    return [...new Set(permissions)];
  }

  // Role-based methods
  hasRole(role: string): boolean {
    if (!this.user) return false;
    const userRole = getUserPrimaryRole(this.user);
    return userRole === role;
  }

  getUserRole(): string | null {
    if (!this.user) return null;
    return getUserPrimaryRole(this.user);
  }

  // Permission-based methods
  hasPermission(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  // Get all user permissions
  getPermissions(): string[] {
    return [...this.userPermissions];
  }

  // Check if user has access based on route configuration
  canAccessRoute(routeConfig: {
    roles?: string[];
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
  }): boolean {
    // Check role-based access (legacy support)
    if (routeConfig.roles && routeConfig.roles.length > 0) {
      const hasRequiredRole = routeConfig.roles.some((role) =>
        this.hasRole(role)
      );
      if (!hasRequiredRole) return false;
    }

    // Check permission-based access
    if (routeConfig.permission) {
      return this.hasPermission(routeConfig.permission);
    }

    if (routeConfig.permissions && routeConfig.permissions.length > 0) {
      if (routeConfig.requireAll) {
        return this.hasAllPermissions(routeConfig.permissions);
      } else {
        return this.hasAnyPermission(routeConfig.permissions);
      }
    }

    // If no specific restrictions, allow access
    return true;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  // Get user display name
  getUserDisplayName(): string {
    if (!this.user) return "";
    return (
      `${this.user.firstName} ${this.user.lastName}`.trim() || this.user.email
    );
  }
}

// Create singleton instance
export const authService = new AuthService();
