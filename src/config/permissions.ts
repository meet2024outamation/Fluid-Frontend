// Centralized permission constants & helpers for CRUD model
// Assumptions: Backend now emits explicit Create/View/Update/Delete permissions per resource.
// For backward compatibility we expand legacy ManageX into the full CRUD set at runtime.

export const RESOURCES = [
  "Projects",
  "Schemas",
  "GlobalSchemas",
  "OrderFlow",
  "Batches",
  "Users",
  "Roles",
  "Tenants",
] as const;

export type ResourceName = (typeof RESOURCES)[number];

export const crudFor = (resource: ResourceName) => ({
  create: `Create${resource}`,
  view: `View${resource}`,
  update: `Update${resource}`,
  delete: `Delete${resource}`,
});

export const expandLegacyManage = (permission: string): string[] => {
  if (!permission.startsWith("Manage")) return [];
  const resource = permission.replace(/^Manage/, "");
  const known = RESOURCES.find(
    (r) => r.toLowerCase() === resource.toLowerCase()
  );
  if (!known) return [];
  const { create, view, update, delete: del } = crudFor(known);
  return [create, view, update, del];
};

export const ADMIN_RESOURCE_SET: ResourceName[] = [
  "Users",
  "Roles",
  "Tenants",
  "Projects",
];

export const isCrudPermission = (p: string) =>
  /^(Create|View|Update|Delete)[A-Z]/.test(p);
