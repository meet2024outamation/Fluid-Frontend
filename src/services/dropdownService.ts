import type { TenantOption, ProjectOption, RoleOption } from "../types";
import { tenantService } from "./tenantService";
import { projectService } from "./projectService";
import { API_CONFIG, apiRequest } from "../config/api";

class DropdownService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
    return response.json();
  }
  // Get tenants for dropdown
  async getTenantOptions(): Promise<TenantOption[]> {
    try {
      const tenants = await tenantService.getTenants();
      return tenants
        .filter((tenant) => tenant.isActive)
        .map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
        }));
    } catch (error) {
      console.error("Error fetching tenant options:", error);
      return [];
    }
  }

  // Get projects for dropdown (optionally filtered by tenant)
  async getProjectOptions(
    tenantId?: string,
    accessibleTenants?: any
  ): Promise<ProjectOption[]> {
    try {
      // If accessibleTenants data is provided, use that instead of API
      if (accessibleTenants) {
        const projects: ProjectOption[] = [];

        // Get projects from regular tenants
        if (accessibleTenants.tenants) {
          accessibleTenants.tenants.forEach((tenant: any) => {
            tenant.projects.forEach((project: any) => {
              if (project.isActive) {
                projects.push({
                  id: project.projectId,
                  name: project.projectName,
                  tenantId: tenant.tenantId,
                });
              }
            });
          });
        }

        // Get projects from tenant admin tenants (tenantAdminIds)
        if (accessibleTenants.tenantAdminIds) {
          accessibleTenants.tenantAdminIds.forEach((_tenantAdmin: any) => {
            // Tenant admin tenants might not have projects loaded yet
            // For now, we'll skip projects from tenant admin tenants as they don't have project data
            // Projects will be loaded when the tenant is selected
          });
        }

        console.log("Projects loaded with tenant mapping:", projects);
        return projects;
      }

      // Fallback to original API approach (but this won't have proper tenantId)
      const projects = await projectService.getAllProjects();
      return projects
        .filter((project) => project.isActive)
        .map((project) => ({
          id: project.id,
          name: project.name,
          tenantId: tenantId || "", // Projects might not have tenantId in current API
        }));
    } catch (error) {
      console.error("Error fetching project options:", error);
      return [];
    }
  }

  // Get role options
  async getRoleOptions(): Promise<RoleOption[]> {
    try {
      // For now, return static roles. In a real app, this would come from an API
      return [
        { id: 1, name: "Product Owner" },
        { id: 2, name: "Tenant Admin" },
        { id: 3, name: "Operator" },
        { id: 4, name: "Member" },
      ];
    } catch (error) {
      console.error("Error fetching role options:", error);
      return [];
    }
  }

  // Alternative: Fetch roles from API if available
  async getRoleOptionsFromApi(): Promise<RoleOption[]> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.ROLES, {
        method: "GET",
      });

      if (!response.ok) {
        // Fallback to static roles if API doesn't exist yet
        return this.getRoleOptions();
      }

      const data = await this.handleResponse<any[]>(response);
      return data.map((role: any) => ({
        id: role.id,
        name: role.name,
      }));
    } catch (error) {
      console.error("Error fetching roles from API:", error);
      // Fallback to static roles
      return this.getRoleOptions();
    }
  }
}

export const dropdownService = new DropdownService();
