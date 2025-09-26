import type { NavigationItem, User, ProjectRole } from "../types";
import { PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE, OPERATOR_ROLE } from "./roles";

// Helper function to determine primary user role for navigation
export const getUserPrimaryRole = (user: User): string => {
  if (!user.roles || user.roles.length === 0) {
    // Default fallback - you might want to determine this differently
    return OPERATOR_ROLE;
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
        return PRODUCT_OWNER_ROLE;
      case 2:
        return TENANT_ADMIN_ROLE;
      case 3:
        return OPERATOR_ROLE;
      default:
        return OPERATOR_ROLE;
    }
  }

  // If it's already a string role, use it directly (legacy support)
  if (typeof firstRole === "string") {
    return firstRole;
  }

  return OPERATOR_ROLE; // Default fallback
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
    roles: [PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE],
  },
  {
    id: "operator-dashboard",
    label: "My Dashboard",
    icon: "LayoutDashboard",
    path: "/operator",
    roles: [OPERATOR_ROLE],
  },
  {
    id: "projects",
    label: "Project Management",
    icon: "Users",
    path: "/projects",
    roles: [PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE],
  },
  {
    id: "schemas",
    label: "Schema Management",
    icon: "Database",
    path: "/schemas",
    roles: [PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE],
  },
  {
    id: "global-schemas",
    label: "Global Schema Management",
    icon: "Database",
    path: "/global-schemas",
    roles: [PRODUCT_OWNER_ROLE],
  },
  {
    id: "field-mapping",
    label: "Field Mapping",
    icon: "ArrowRightLeft",
    path: "/field-mapping",
    roles: [PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE],
  },
  {
    id: "order-flow",
    label: "Order Flow Management",
    icon: "GitBranch",
    path: "/order-flow",
    roles: [TENANT_ADMIN_ROLE],
  },
  {
    id: "batches",
    label: "Batch Management",
    icon: "Package",
    path: "/batches",
    roles: [PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE],
  },
  {
    id: "orders",
    label: "Order Processing",
    icon: "FileText",
    path: "/orders",
    roles: [OPERATOR_ROLE],
  },
  {
    id: "pdf-viewer",
    label: "PDF Viewer Demo",
    icon: "FileText",
    path: "/pdf-viewer",
    roles: [PRODUCT_OWNER_ROLE, TENANT_ADMIN_ROLE, OPERATOR_ROLE],
  },
  {
    id: "user-management",
    label: "User Management",
    icon: "UserCog",
    path: "/users",
    roles: [PRODUCT_OWNER_ROLE],
  },
  {
    id: "order-status-management",
    label: "Order Status Management",
    icon: "ListChecks",
    path: "/order-status-management",
    roles: [PRODUCT_OWNER_ROLE],
  },
  {
    id: "tenant-management",
    label: "Tenant Management",
    icon: "Building",
    path: "/tenants",
    roles: [PRODUCT_OWNER_ROLE],
  },
];

// No more legacy Admin role; only use explicit roles
export const getNavigationForRole = (role: string): NavigationItem[] => {
  return navigationItems.filter((item) => item.roles.includes(role as any));
};

export const getNavigationForUser = (user: User): NavigationItem[] => {
  const primaryRole = getUserPrimaryRole(user);
  return getNavigationForRole(primaryRole);
};
