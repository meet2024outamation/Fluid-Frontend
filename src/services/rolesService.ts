import type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleWithPermissions,
} from "../types";
import { API_CONFIG, apiRequest } from "../config/api";

export interface RoleFilters {
  search?: string;
}

class RolesService {
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

  // Helper function to parse role with additional metadata
  private parseRoleWithPermissions(role: any): RoleWithPermissions {
    return {
      ...role,
      permissionCount: role.permissionCount || role.permissions?.length || 0,
      userCount: role.userCount || 0,
    };
  }

  async getRoles(filters?: RoleFilters): Promise<RoleWithPermissions[]> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.ROLES, {
        method: "GET",
      });

      const data = await this.handleResponse<any[]>(response);

      let filteredData = data;

      // Apply client-side filtering since API doesn't support query params
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter((role) =>
          role.name.toLowerCase().includes(searchTerm)
        );
      }

      return filteredData.map((role: any) =>
        this.parseRoleWithPermissions(role)
      );
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw error;
    }
  }

  async getRoleById(id: number): Promise<Role | null> {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch role: ${response.statusText}`);
      }

      return await this.handleResponse<Role>(response);
    } catch (error) {
      console.error("Error fetching role by id:", error);
      throw error;
    }
  }

  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await apiRequest("/api/permissions", {
        method: "GET",
      });

      return await this.handleResponse<Permission[]>(response);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      throw error;
    }
  }

  async createRole(roleData: CreateRoleRequest): Promise<Role> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.ROLES, {
        method: "POST",
        body: JSON.stringify(roleData),
      });

      return await this.handleResponse<Role>(response);
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  }

  async updateRole(
    id: number,
    roleData: Omit<UpdateRoleRequest, "id">
  ): Promise<Role> {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`, {
        method: "PUT",
        body: JSON.stringify(roleData),
      });

      return await this.handleResponse<Role>(response);
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  }

  async deleteRole(id: number): Promise<void> {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.ROLES}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to delete role: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      throw error;
    }
  }

  async getRoleStats(): Promise<{
    total: number;
  }> {
    try {
      const roles = await this.getRoles();

      return {
        total: roles.length,
      };
    } catch (error) {
      console.error("Error fetching role stats:", error);
      throw error;
    }
  }
}

export const rolesService = new RolesService();
