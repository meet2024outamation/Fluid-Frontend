import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import type {
  AccessibleTenantsResponse,
  AccessibleTenant,
  AccessibleProject,
} from "../types";
import { TENANT_ADMIN_ROLE } from "../config/roles";

interface TenantSelectionContextType {
  accessibleTenants: AccessibleTenantsResponse | null;
  selectedTenantIdentifier: string | null;
  selectedProjectId: number | null;
  isLoading: boolean;
  isProductOwner: boolean;
  isTenantAdmin: boolean;
  hasProjectAccess: boolean;
  needsTenantSelection: boolean;
  needsProjectSelection: boolean;
  selectTenant: (tenantIdentifier: string) => void;
  selectProject: (projectId: number) => void;
  clearSelection: () => void;
  getSelectedTenant: () => AccessibleTenant | null;
  getSelectedProject: () => AccessibleProject | null;
  getAllAccessibleTenants: () => AccessibleTenant[];
}

const TenantSelectionContext = createContext<
  TenantSelectionContextType | undefined
>(undefined);

interface TenantSelectionProviderProps {
  children: React.ReactNode;
}

export const TenantSelectionProvider: React.FC<
  TenantSelectionProviderProps
> = ({ children }) => {
  const { accessibleTenants } = useAuth();
  const [selectedTenantIdentifier, setSelectedTenantIdentifier] = useState<
    string | null
  >(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [isLoading] = useState(false);

  // Convert tenant admin info to accessible tenant format and merge with regular tenants
  const getAllAccessibleTenants = (): AccessibleTenant[] => {
    if (!accessibleTenants) return [];

    const adminTenants: AccessibleTenant[] = (
      accessibleTenants.tenantAdminIds || []
    ).map((adminInfo) => ({
      tenantId: adminInfo.tenantId,
      tenantName: adminInfo.tenantName,
      tenantIdentifier: adminInfo.tenantIdentifier,
      description: adminInfo.description || undefined,
      userRoles: [TENANT_ADMIN_ROLE],
      projects: [], // Projects will be loaded when tenant is selected
      projectCount: 0,
    }));

    const regularTenants = accessibleTenants.tenants || [];

    // Merge and deduplicate tenants by tenantId
    const allTenants = [...adminTenants, ...regularTenants];
    const uniqueTenants = allTenants.reduce((acc, tenant) => {
      if (!acc.some((t) => t.tenantId === tenant.tenantId)) {
        acc.push(tenant);
      }
      return acc;
    }, [] as AccessibleTenant[]);

    return uniqueTenants;
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedTenantIdentifier = localStorage.getItem(
      "selectedTenantIdentifier"
    );
    const savedTenantId = localStorage.getItem("selectedTenantId"); // fallback for existing data
    const savedProjectId = localStorage.getItem("selectedProjectId");

    const allTenants = getAllAccessibleTenants();
    if (accessibleTenants && allTenants.length > 0) {
      if (savedTenantIdentifier) {
        // Prefer identifier if available
        const tenant = allTenants.find(
          (t) => t.tenantIdentifier === savedTenantIdentifier
        );
        if (tenant) {
          setSelectedTenantIdentifier(tenant.tenantIdentifier);
        } else {
          // Clear invalid identifier
          localStorage.removeItem("selectedTenantIdentifier");
        }
      } else if (savedTenantId) {
        // Fallback to ID (for backward compatibility)
        const tenant = allTenants.find((t) => t.tenantId === savedTenantId);
        if (tenant) {
          setSelectedTenantIdentifier(tenant.tenantIdentifier);
          // Migrate to identifier-based storage
          localStorage.setItem(
            "selectedTenantIdentifier",
            tenant.tenantIdentifier
          );
          // Remove old ID-based storage
          localStorage.removeItem("selectedTenantId");
        } else {
          // Clear invalid ID
          localStorage.removeItem("selectedTenantId");
        }
      }
    }

    if (savedProjectId) {
      setSelectedProjectId(parseInt(savedProjectId));
    }
  }, [accessibleTenants]);

  // Save to localStorage when selection changes
  useEffect(() => {
    if (selectedTenantIdentifier) {
      localStorage.setItem(
        "selectedTenantIdentifier",
        selectedTenantIdentifier
      );
    } else {
      localStorage.removeItem("selectedTenantIdentifier");
      localStorage.removeItem("selectedTenantId"); // Clean up old storage
    }
  }, [selectedTenantIdentifier]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("selectedProjectId", selectedProjectId.toString());
    } else {
      localStorage.removeItem("selectedProjectId");
    }
  }, [selectedProjectId]);

  const selectTenant = (tenantIdentifier: string) => {
    // Directly set the tenant identifier
    setSelectedTenantIdentifier(tenantIdentifier);
    // Clear project selection when switching tenants
    setSelectedProjectId(null);
  };

  const selectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  const clearSelection = () => {
    setSelectedTenantIdentifier(null);
    setSelectedProjectId(null);
    localStorage.removeItem("selectedTenantIdentifier");
    localStorage.removeItem("selectedTenantId"); // Clean up old storage
  };

  const getSelectedTenant = (): AccessibleTenant | null => {
    if (!accessibleTenants || !selectedTenantIdentifier) return null;
    const allTenants = getAllAccessibleTenants();
    return (
      allTenants.find((t) => t.tenantIdentifier === selectedTenantIdentifier) ||
      null
    );
  };

  const getSelectedProject = (): AccessibleProject | null => {
    const tenant = getSelectedTenant();
    if (!tenant || !selectedProjectId) return null;
    return (
      tenant.projects.find((p) => p.projectId === selectedProjectId) || null
    );
  };

  // Computed properties
  const isProductOwner = accessibleTenants?.isProductOwner || false;
  const isTenantAdmin = (accessibleTenants?.tenantAdminIds?.length || 0) > 0;
  const hasProjectAccess = (accessibleTenants?.tenants?.length || 0) > 0;

  // Determine if user needs to make selections
  const needsTenantSelection =
    !isProductOwner &&
    !selectedTenantIdentifier &&
    !isLoading && // Don't show selection if still loading tenant details
    (isTenantAdmin || hasProjectAccess); // Tenant admin always needs tenant selection first

  const needsProjectSelection =
    !isProductOwner &&
    !isTenantAdmin &&
    hasProjectAccess &&
    !!selectedTenantIdentifier &&
    !selectedProjectId;

  const value: TenantSelectionContextType = {
    accessibleTenants,
    selectedTenantIdentifier,
    selectedProjectId,
    isLoading,
    isProductOwner,
    isTenantAdmin,
    hasProjectAccess,
    needsTenantSelection,
    needsProjectSelection,
    selectTenant,
    selectProject,
    clearSelection,
    getSelectedTenant,
    getSelectedProject,
    getAllAccessibleTenants,
  };

  return (
    <TenantSelectionContext.Provider value={value}>
      {children}
    </TenantSelectionContext.Provider>
  );
};

export const useTenantSelection = (): TenantSelectionContextType => {
  const context = useContext(TenantSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useTenantSelection must be used within a TenantSelectionProvider"
    );
  }
  return context;
};
