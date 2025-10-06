import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import type {
  AccessibleTenantsResponse,
  AccessibleTenant,
  AccessibleProject,
} from "../types";

interface TenantSelectionContextType {
  accessibleTenants: AccessibleTenantsResponse | null;
  selectedTenantIdentifier: string | null;
  selectedProjectId: number | null;
  selectionConfirmed: boolean;
  isLoading: boolean;
  isProductOwner: boolean;
  isTenantAdmin: boolean;
  hasProjectAccess: boolean;
  needsTenantSelection: boolean;
  needsProjectSelection: boolean;
  selectTenant: (tenantIdentifier: string) => Promise<void>;
  selectProject: (projectId: number) => Promise<void>;
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
  const { accessibleTenants, updateUserContext } = useAuth();
  const [selectedTenantIdentifier, setSelectedTenantIdentifier] = useState<
    string | null
  >(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
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
      userRoles: ["Tenant Admin"],
      projects: [],
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
    const savedTenantId = localStorage.getItem("selectedTenantId");
    const savedProjectId = localStorage.getItem("selectedProjectId");
    const savedSelectionConfirmed = localStorage.getItem("selectionConfirmed");

    const allTenants = getAllAccessibleTenants();
    if (accessibleTenants && allTenants.length > 0) {
      let tenantRestored = false;

      if (savedTenantIdentifier) {
        const tenant = allTenants.find(
          (t) => t.tenantIdentifier === savedTenantIdentifier
        );
        if (tenant) {
          setSelectedTenantIdentifier(tenant.tenantIdentifier);
          tenantRestored = true;
        } else {
          localStorage.removeItem("selectedTenantIdentifier");
        }
      } else if (savedTenantId) {
        const tenant = allTenants.find((t) => t.tenantId === savedTenantId);
        if (tenant) {
          setSelectedTenantIdentifier(tenant.tenantIdentifier);
          localStorage.setItem(
            "selectedTenantIdentifier",
            tenant.tenantIdentifier
          );
          localStorage.removeItem("selectedTenantId");
          tenantRestored = true;
        } else {
          localStorage.removeItem("selectedTenantId");
        }
      }

      // Restore selectionConfirmed if tenant was restored
      if (tenantRestored && savedSelectionConfirmed === "true") {
        setSelectionConfirmed(true);
      }

      // Only restore project if tenant was successfully restored
      if (tenantRestored && savedProjectId) {
        setSelectedProjectId(parseInt(savedProjectId));
      } else if (!tenantRestored) {
        // Clear project if tenant wasn't restored
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("selectionConfirmed");
      }
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
      localStorage.removeItem("selectedTenantId");
    }
  }, [selectedTenantIdentifier]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("selectedProjectId", selectedProjectId.toString());
    } else {
      localStorage.removeItem("selectedProjectId");
    }
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem("selectionConfirmed", selectionConfirmed.toString());
  }, [selectionConfirmed]);

  const selectTenant = async (tenantIdentifier: string) => {
    setSelectedTenantIdentifier(tenantIdentifier);
    setSelectedProjectId(null);
    setSelectionConfirmed(true);

    const allTenants = getAllAccessibleTenants();
    const tenant = allTenants.find(
      (t) => t.tenantIdentifier === tenantIdentifier
    );
    if (tenant) {
      try {
        await updateUserContext(tenant.tenantIdentifier);
      } catch (error) {
        console.error(
          "Failed to update user context after tenant selection:",
          error
        );
      }
    }
  };

  const selectProject = async (projectId: number) => {
    setSelectedProjectId(projectId);

    const tenant = getSelectedTenant();
    if (tenant) {
      try {
        await updateUserContext(tenant.tenantIdentifier, projectId);
      } catch (error) {
        console.error(
          "Failed to update user context after project selection:",
          error
        );
      }
    }
  };

  const clearSelection = () => {
    setSelectedTenantIdentifier(null);
    setSelectedProjectId(null);
    setSelectionConfirmed(false);
    localStorage.removeItem("selectedTenantIdentifier");
    localStorage.removeItem("selectedTenantId");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectionConfirmed");
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
    !isLoading &&
    (isTenantAdmin || hasProjectAccess);

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
    selectionConfirmed,
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
