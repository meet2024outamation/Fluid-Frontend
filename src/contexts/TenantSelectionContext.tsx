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
  selectTenantAndProject: (
    tenantIdentifier: string,
    projectId: number
  ) => Promise<void>;
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
  >(localStorage.getItem("selectedTenantIdentifier"));
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    localStorage.getItem("selectedProjectId")
      ? parseInt(localStorage.getItem("selectedProjectId")!)
      : null
  );
  const [selectionConfirmed, setSelectionConfirmed] = useState<boolean>(
    localStorage.getItem("selectionConfirmed") === "true"
  );
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Merge tenant admin + regular tenants
  const getAllAccessibleTenants = (): AccessibleTenant[] => {
    if (!accessibleTenants) return [];

    const adminTenants: AccessibleTenant[] =
      accessibleTenants.tenantAdminIds?.map((adminInfo) => ({
        tenantId: adminInfo.tenantId,
        tenantName: adminInfo.tenantName,
        tenantIdentifier: adminInfo.tenantIdentifier,
        description: adminInfo.description || undefined,
        userRoles: ["Tenant Admin"],
        projects: [],
        projectCount: 0,
      })) || [];

    const regularTenants = accessibleTenants.tenants || [];
    const allTenants = [...adminTenants, ...regularTenants];

    const uniqueTenants = allTenants.reduce((acc, tenant) => {
      if (!acc.some((t) => t.tenantId === tenant.tenantId)) acc.push(tenant);
      return acc;
    }, [] as AccessibleTenant[]);

    return uniqueTenants;
  };

  // 🔹 Restore selection after reload only when tenants are ready
  useEffect(() => {
    if (!accessibleTenants) return;

    const allTenants = getAllAccessibleTenants();
    if (allTenants.length === 0) return;

    const savedTenantIdentifier = localStorage.getItem(
      "selectedTenantIdentifier"
    );
    const savedProjectId = localStorage.getItem("selectedProjectId");
    const savedSelectionConfirmed = localStorage.getItem("selectionConfirmed");

    if (savedTenantIdentifier) {
      const tenant = allTenants.find(
        (t) => t.tenantIdentifier === savedTenantIdentifier
      );
      if (tenant) {
        setSelectedTenantIdentifier(savedTenantIdentifier);
        setSelectionConfirmed(savedSelectionConfirmed === "true");

        if (savedProjectId) {
          const projectIdNum = parseInt(savedProjectId);
          if (!isNaN(projectIdNum)) setSelectedProjectId(projectIdNum);
        }

        // Reapply user context silently
        updateUserContext(
          savedTenantIdentifier,
          savedProjectId ? parseInt(savedProjectId) : undefined
        ).catch(() =>
          console.warn("Failed to restore user context on refresh")
        );
      } else {
        console.warn(
          "Stored tenant not found in accessible tenants, clearing storage"
        );
        clearSelection();
      }
    }
  }, [accessibleTenants]);

  // 🔹 Persist to localStorage
  useEffect(() => {
    if (selectedTenantIdentifier)
      localStorage.setItem(
        "selectedTenantIdentifier",
        selectedTenantIdentifier
      );
    else localStorage.removeItem("selectedTenantIdentifier");
  }, [selectedTenantIdentifier]);

  useEffect(() => {
    if (selectedProjectId)
      localStorage.setItem("selectedProjectId", selectedProjectId.toString());
    else localStorage.removeItem("selectedProjectId");
  }, [selectedProjectId]);

  useEffect(() => {
    localStorage.setItem("selectionConfirmed", selectionConfirmed.toString());
  }, [selectionConfirmed]);

  // 🔹 Tenant selection
  const selectTenant = async (tenantIdentifier: string) => {
    setIsLoading(true);
    setSelectedTenantIdentifier(tenantIdentifier);
    setSelectedProjectId(null);
    setSelectionConfirmed(true);

    try {
      await updateUserContext(tenantIdentifier);
    } catch (error) {
      console.error(
        "Failed to update user context after tenant selection:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Project selection
  const selectProject = async (projectId: number) => {
    setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 🔹 Direct tenant and project selection (for regular users)
  const selectTenantAndProject = async (
    tenantIdentifier: string,
    projectId: number
  ) => {
    setIsLoading(true);
    setSelectedTenantIdentifier(tenantIdentifier);
    setSelectedProjectId(projectId);
    setSelectionConfirmed(true);

    try {
      await updateUserContext(tenantIdentifier, projectId);
    } catch (error) {
      console.error(
        "Failed to update user context after tenant and project selection:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Clear selection safely
  const clearSelection = () => {
    setSelectedTenantIdentifier(null);
    setSelectedProjectId(null);
    setSelectionConfirmed(false);
    localStorage.removeItem("selectedTenantIdentifier");
    localStorage.removeItem("selectedProjectId");
    localStorage.removeItem("selectionConfirmed");
  };

  // 🔹 Helpers
  const getSelectedTenant = (): AccessibleTenant | null => {
    if (!accessibleTenants || !selectedTenantIdentifier) return null;
    return (
      getAllAccessibleTenants().find(
        (t) => t.tenantIdentifier === selectedTenantIdentifier
      ) || null
    );
  };

  const getSelectedProject = (): AccessibleProject | null => {
    const tenant = getSelectedTenant();
    if (!tenant || !selectedProjectId) return null;
    return (
      tenant.projects.find((p) => p.projectId === selectedProjectId) || null
    );
  };

  const isProductOwner = accessibleTenants?.isProductOwner || false;
  const isTenantAdmin = (accessibleTenants?.tenantAdminIds?.length || 0) > 0;
  const hasProjectAccess = (accessibleTenants?.tenants?.length || 0) > 0;

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
    selectTenantAndProject,
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
  if (!context) {
    throw new Error(
      "useTenantSelection must be used within a TenantSelectionProvider"
    );
  }
  return context;
};
