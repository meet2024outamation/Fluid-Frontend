import type { NavigationItem } from "../types";

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
    roles: ["Admin", "Manager"],
  },
  {
    id: "operator-dashboard",
    label: "My Dashboard",
    icon: "LayoutDashboard",
    path: "/operator",
    roles: ["Operator"],
  },
  {
    id: "clients",
    label: "Client Management",
    icon: "Users",
    path: "/clients",
    roles: ["Admin", "Manager"],
  },
  {
    id: "schemas",
    label: "Schema Management",
    icon: "Database",
    path: "/schemas",
    roles: ["Admin"],
  },
  {
    id: "field-mapping",
    label: "Field Mapping",
    icon: "ArrowRightLeft",
    path: "/field-mapping",
    roles: ["Admin", "Manager"],
  },
  {
    id: "batches",
    label: "Batch Management",
    icon: "Package",
    path: "/batches",
    roles: ["Admin", "Manager"],
  },
  {
    id: "orders",
    label: "Order Processing",
    icon: "FileText",
    path: "/orders",
    roles: ["Operator"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    path: "/settings",
    roles: ["Admin"],
  },
];

export const getNavigationForRole = (role: string): NavigationItem[] => {
  return navigationItems.filter((item) => item.roles.includes(role as any));
};
