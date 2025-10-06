import type { NavigationItem, User, ProjectRole } from "../types";
import { RoleService } from "../services/roleService";
import { permissionService } from "../services/permissionService";

// Helper function to determine primary user role for navigation
export const getUserPrimaryRole = (user: User): string => {
  // Get roles from Me API data if available
  const meData = permissionService.getMeData();
  if (meData?.Roles && meData.Roles.length > 0) {
    return RoleService.getPrimaryRole(meData.Roles) || "Keying";
  }

  // Legacy support for old user roles structure
  if (!user.roles || user.roles.length === 0) {
    return "Keying"; // Default fallback
  }

  // Get the first role from the user's roles array
  const firstRole = user.roles[0];

  // If it's a ProjectRole object, check if it has roleName first, then map roleId
  if (typeof firstRole === "object" && "roleId" in firstRole) {
    const projectRole = firstRole as ProjectRole;

    // Use roleName from backend if available
    if (projectRole.roleName) {
      return projectRole.roleName;
    }

    // Fallback to roleId mapping if roleName is not available
    switch (projectRole.roleId) {
      case 1:
        return "Product Owner";
      case 2:
        return "Tenant Admin";
      case 3:
        return "Keying";
      default:
        return "Keying";
    }
  }

  // If it's already a string role, use it directly (legacy support)
  if (typeof firstRole === "string") {
    return firstRole;
  }

  return "Keying"; // Default fallback
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
    requiredPermissions: ["ViewReports", "ViewProjects"], // ANY: reports or can view projects
    roles: ["Product Owner", "Tenant Admin"], // Legacy fallback
  },
  {
    id: "operator-dashboard",
    label: "My Dashboard",
    icon: "LayoutDashboard",
    path: "/operator",
    requiredPermissions: ["ViewOrders", "ProcessOrders"], // Permission-based access (ANY)
    roles: ["Keying"], // Legacy fallback
  },
  {
    id: "projects",
    label: "Project Management",
    icon: "Users",
    path: "/projects",
    requiredPermissions: ["ViewProjects"], // Page access; create/update/delete gated inside
    roles: ["Product Owner", "Tenant Admin"], // Legacy fallback
  },
  {
    id: "schemas",
    label: "Schema Management",
    icon: "Database",
    path: "/schemas",
    requiredPermissions: ["ViewSchemas"],
    roles: ["Product Owner", "Tenant Admin"], // Legacy fallback
  },
  {
    id: "global-schemas",
    label: "Global Schema Management",
    icon: "Database",
    path: "/global-schemas",
    requiredPermissions: ["ViewGlobalSchemas"],
    roles: ["Product Owner"], // Legacy fallback
  },
  {
    id: "field-mapping",
    label: "Field Mapping",
    icon: "ArrowRightLeft",
    path: "/field-mapping",
    requiredPermissions: ["ViewSchemas", "ViewProjects"], // ANY of related view perms
    roles: ["Product Owner", "Tenant Admin"], // Legacy fallback
  },
  {
    id: "order-flow",
    label: "Order Flow Management",
    icon: "GitBranch",
    path: "/order-flow",
    requiredPermissions: ["ViewOrderFlow"],
    roles: ["Tenant Admin"], // Legacy fallback
  },
  {
    id: "batches",
    label: "Batch Management",
    icon: "Package",
    path: "/batches",
    requiredPermissions: ["ViewBatches", "CreateOrder"], // ANY
    roles: ["Product Owner", "Tenant Admin"], // Legacy fallback
  },
  {
    id: "orders",
    label: "Order Processing",
    icon: "FileText",
    path: "/orders",
    requiredPermissions: ["ViewOrders", "ProcessOrders"], // Permission-based access (ANY)
    roles: ["Keying"], // Legacy fallback
  },
  {
    id: "pdf-viewer",
    label: "PDF Viewer Demo",
    icon: "FileText",
    path: "/pdf-viewer",
    requiredPermissions: ["ViewOrders"], // Permission-based access (most users should have this)
    roles: ["Product Owner", "Tenant Admin", "Keying"], // Legacy fallback
  },
  {
    id: "user-management",
    label: "User Management",
    icon: "UserCog",
    path: "/users",
    requiredPermissions: ["ViewUsers"],
    roles: ["Product Owner"], // Legacy fallback
  },
  {
    id: "roles-management",
    label: "Roles Management",
    icon: "Shield",
    path: "/roles",
    requiredPermissions: ["ViewRoles"],
    roles: ["Product Owner"], // Legacy fallback
  },
  {
    id: "order-status-management",
    label: "Order Status Management",
    icon: "ListChecks",
    path: "/order-status-management",
    requiredPermissions: ["ViewOrderFlow", "ViewReports"], // ANY
    roles: ["Product Owner"], // Legacy fallback
  },
  {
    id: "tenant-management",
    label: "Tenant Management",
    icon: "Building",
    path: "/tenants",
    requiredPermissions: ["ViewTenants"],
    roles: ["Product Owner"], // Legacy fallback
  },
];

// Permission-aware navigation filtering (prioritizes permission-based access)
export const canAccessNavigationItem = (
  item: NavigationItem,
  user: User
): boolean => {
  const dev = import.meta.env?.DEV;
  const debugLog = (reason: string) => {
    // if (dev) {
    //   // Aggregate minimal info for diagnosing why nav item hidden
    //   console.log(`[NAV] hide '${item.id}': ${reason}`, {
    //     reqPerms: item.requiredPermissions,
    //     userPerms: permissionService.getUserPermissionNames?.(),
    //   });
    // }
  };
  // PRIORITIZE PERMISSION-BASED ACCESS CONTROL

  // Check new preferred requiredPermissions array first
  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    if (item.requireAllPermissions) {
      const ok = permissionService.hasAllPermissions(item.requiredPermissions);
      if (!ok) debugLog("missing one of requiredPermissions (ALL mode)");
      return ok;
    } else {
      const ok = permissionService.hasAnyPermission(item.requiredPermissions);
      if (!ok) debugLog("missing all requiredPermissions (ANY mode)");
      return ok;
    }
  }

  // Check legacy single permission field
  if (item.permission) {
    const ok = permissionService.hasPermission(item.permission);
    if (!ok) debugLog("missing legacy single permission");
    return ok;
  }

  // Check legacy permissions array field
  if (item.permissions && item.permissions.length > 0) {
    if (item.requireAllPermissions) {
      const ok = permissionService.hasAllPermissions(item.permissions);
      if (!ok) debugLog("missing one of legacy permissions (ALL mode)");
      return ok;
    } else {
      const ok = permissionService.hasAnyPermission(item.permissions);
      if (!ok) debugLog("missing all legacy permissions (ANY mode)");
      return ok;
    }
  }

  // FALLBACK TO ROLE-BASED ACCESS CONTROL (for backward compatibility)
  if (item.roles && item.roles.length > 0) {
    // Use RoleService to check if user has any of the required roles
    const meData = permissionService.getMeData();
    if (meData?.Roles) {
      const ok = RoleService.hasAnyRole(meData.Roles, item.roles);
      if (!ok) debugLog("missing role in MeData roles");
      return ok;
    }

    // Legacy support for old role structure
    const primaryRole = getUserPrimaryRole(user);
    const ok = item.roles.includes(primaryRole);
    if (!ok) debugLog("missing legacy primary role match");
    return ok;
  }

  // If no restrictions, allow access
  return true;
};

// Get navigation items based on user permissions and roles
export const getNavigationForUser = (user: User): NavigationItem[] => {
  return navigationItems.filter((item) => canAccessNavigationItem(item, user));
};

// Legacy role-based function (kept for compatibility)
export const getNavigationForRole = (role: string): NavigationItem[] => {
  return navigationItems.filter((item) => item.roles?.includes(role));
};
