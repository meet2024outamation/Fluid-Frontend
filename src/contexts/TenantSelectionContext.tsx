import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_CONFIG, apiRequest } from "../config/api";
import type {
  AccessibleTenantsResponse,
  AccessibleTenant,
  AccessibleProject,
} from "../types";

interface TenantSelectionContextType {
  accessibleTenants: AccessibleTenantsResponse | null;
  selectedTenantId: string | null;
  selectedProjectId: number | null;
  isLoading: boolean;
  isProductOwner: boolean;
  isTenantAdmin: boolean;
  hasProjectAccess: boolean;
  needsTenantSelection: boolean;
  needsProjectSelection: boolean;
  selectTenant: (tenantId: string) => void;
  selectProject: (projectId: number) => void;
  clearSelection: () => void;
  getSelectedTenant: () => AccessibleTenant | null;
  getSelectedProject: () => AccessibleProject | null;
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
  const { accessibleTenants, setAccessibleTenants } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch tenant details for tenant admins
  const fetchTenantDetails = async (tenantIds: string[]) => {
    try {
      setIsLoading(true);
      const tenantDetailsPromises = tenantIds.map(async (tenantId) => {
        try {
          const response = await apiRequest(
            `${API_CONFIG.ENDPOINTS.TENANTS}/${tenantId}`,
            {
              method: "GET",
            }
          );

          if (response.ok) {
            const tenantData = await response.json();
            return {
              tenantId: tenantData.id,
              tenantName: tenantData.name,
              tenantIdentifier: tenantData.identifier,
              description: tenantData.description,
              userRoles: ["Tenant Admin"],
              projects: [], // Projects will be loaded when tenant is selected
              projectCount: 0,
            };
          } else {
            // Fallback to minimal tenant object if API fails
            return {
              tenantId: tenantId,
              tenantName: `Tenant ${tenantId.substring(0, 8)}...`,
              tenantIdentifier: tenantId,
              description: null,
              userRoles: ["Tenant Admin"],
              projects: [],
              projectCount: 0,
            };
          }
        } catch (error) {
          console.error(
            `Failed to fetch details for tenant ${tenantId}:`,
            error
          );
          // Return minimal tenant object on error
          return {
            tenantId: tenantId,
            tenantName: `Tenant ${tenantId.substring(0, 8)}...`,
            tenantIdentifier: tenantId,
            description: null,
            userRoles: ["Tenant Admin"],
            projects: [],
            projectCount: 0,
          };
        }
      });

      const tenantDetails = await Promise.all(tenantDetailsPromises);

      // Update accessible tenants with detailed information
      if (accessibleTenants) {
        const updatedAccessibleTenants = {
          ...accessibleTenants,
          tenants: tenantDetails,
        };
        setAccessibleTenants(updatedAccessibleTenants);
      }
    } catch (error) {
      console.error("Failed to fetch tenant details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load tenant details for tenant admins when needed
  useEffect(() => {
    if (
      accessibleTenants &&
      accessibleTenants.tenantAdminTenantIds?.length > 0 &&
      (!accessibleTenants.tenants || accessibleTenants.tenants.length === 0)
    ) {
      fetchTenantDetails(accessibleTenants.tenantAdminTenantIds);
    }
  }, [accessibleTenants?.tenantAdminTenantIds]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTenantId = localStorage.getItem("selectedTenantId");
    const savedProjectId = localStorage.getItem("selectedProjectId");

    if (savedTenantId) {
      setSelectedTenantId(savedTenantId);
    }
    if (savedProjectId) {
      setSelectedProjectId(parseInt(savedProjectId));
    }
  }, []);

  // Save to localStorage when selection changes
  useEffect(() => {
    if (selectedTenantId) {
      localStorage.setItem("selectedTenantId", selectedTenantId);
    } else {
      localStorage.removeItem("selectedTenantId");
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("selectedProjectId", selectedProjectId.toString());
    } else {
      localStorage.removeItem("selectedProjectId");
    }
  }, [selectedProjectId]);

  const selectTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    // Clear project selection when switching tenants
    setSelectedProjectId(null);
  };

  const selectProject = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  const clearSelection = () => {
    setSelectedTenantId(null);
    setSelectedProjectId(null);
  };

  const getSelectedTenant = (): AccessibleTenant | null => {
    if (!accessibleTenants || !selectedTenantId) return null;
    return (
      accessibleTenants.tenants.find((t) => t.tenantId === selectedTenantId) ||
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
  const isTenantAdmin =
    (accessibleTenants?.tenantAdminTenantIds?.length || 0) > 0;
  const hasProjectAccess = (accessibleTenants?.tenants?.length || 0) > 0;

  // Determine if user needs to make selections
  const needsTenantSelection =
    !isProductOwner &&
    !selectedTenantId &&
    !isLoading && // Don't show selection if still loading tenant details
    (isTenantAdmin || hasProjectAccess); // Tenant admin always needs tenant selection first

  const needsProjectSelection =
    !isProductOwner &&
    !isTenantAdmin &&
    hasProjectAccess &&
    !!selectedTenantId &&
    !selectedProjectId;

  const value: TenantSelectionContextType = {
    accessibleTenants,
    selectedTenantId,
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
