import type { NavigationItem, User, ProjectRole } from "../types";

// Helper function to determine primary user role for navigation
export const getUserPrimaryRole = (user: User): string => {
  if (!user.roles || user.roles.length === 0) {
    // Default fallback - you might want to determine this differently
    return "Operator";
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
        return "Operator";
      default:
        return "Operator";
    }
  }

  // If it's already a string role, use it directly (legacy support)
  if (typeof firstRole === "string") {
    return firstRole;
  }

  return "Operator"; // Default fallback
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
    roles: ["Product Owner", "Tenant Admin"],
  },
  {
    id: "operator-dashboard",
    label: "My Dashboard",
    icon: "LayoutDashboard",
    path: "/operator",
    roles: ["Operator"],
  },
  {
    id: "projects",
    label: "Project Management",
    icon: "Users",
    path: "/projects",
    roles: ["Product Owner", "Tenant Admin"],
  },
  {
    id: "schemas",
    label: "Schema Management",
    icon: "Database",
    path: "/schemas",
    roles: ["Product Owner", "Tenant Admin"],
  },
  {
    id: "global-schemas",
    label: "Global Schema Management",
    icon: "Database",
    path: "/global-schemas",
    roles: ["Product Owner"],
  },
  {
    id: "field-mapping",
    label: "Field Mapping",
    icon: "ArrowRightLeft",
    path: "/field-mapping",
    roles: ["Product Owner", "Tenant Admin"],
  },
  {
    id: "batches",
    label: "Batch Management",
    icon: "Package",
    path: "/batches",
    roles: ["Product Owner", "Tenant Admin"],
  },
  {
    id: "orders",
    label: "Order Processing",
    icon: "FileText",
    path: "/orders",
    roles: ["Operator"],
  },
  {
    id: "user-management",
    label: "User Management",
    icon: "UserCog",
    path: "/users",
    roles: ["Product Owner"],
  },
  {
    id: "tenant-management",
    label: "Tenant Management",
    icon: "Building",
    path: "/tenants",
    roles: ["Product Owner"],
  },
];

export const getNavigationForRole = (role: string): NavigationItem[] => {
  // Map legacy "Admin" role to "Product Owner" for backward compatibility
  const normalizedRole = role === "Admin" ? "Product Owner" : role;

  return navigationItems.filter((item) =>
    item.roles.includes(normalizedRole as any)
  );
};

export const getNavigationForUser = (user: User): NavigationItem[] => {
  const primaryRole = getUserPrimaryRole(user);
  return getNavigationForRole(primaryRole);
};
