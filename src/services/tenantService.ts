import type {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
} from "../types";
import { API_CONFIG, apiRequest } from "../config/api";

export interface TenantFilters {
  search?: string;
}

class TenantService {
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

  // Helper function to convert API response dates from strings to Date objects
  private parseTenantDates(tenant: any): Tenant {
    return {
      ...tenant,
      createdAt: tenant.createdAt ? new Date(tenant.createdAt) : new Date(),
      updatedAt: tenant.updatedAt ? new Date(tenant.updatedAt) : new Date(),
    };
  }

  async getTenants(filters?: TenantFilters): Promise<Tenant[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) {
        queryParams.append("search", filters.search);
      }

      const endpoint = queryParams.toString()
        ? `${API_CONFIG.ENDPOINTS.TENANTS}?${queryParams.toString()}`
        : API_CONFIG.ENDPOINTS.TENANTS;

      const response = await apiRequest(endpoint, {
        method: "GET",
      });

      const data = await this.handleResponse<any[]>(response);
      return data.map((tenant: any) => this.parseTenantDates(tenant));
    } catch (error) {
      console.error("Error fetching tenants:", error);
      throw error;
    }
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.TENANTS}/${id}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch tenant: ${response.statusText}`);
      }

      const data = await this.handleResponse<any>(response);
      return this.parseTenantDates(data);
    } catch (error) {
      console.error("Error fetching tenant by id:", error);
      throw error;
    }
  }

  async createTenant(tenantData: CreateTenantRequest): Promise<Tenant> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.TENANTS, {
        method: "POST",
        body: JSON.stringify(tenantData),
      });

      const data = await this.handleResponse<any>(response);
      return this.parseTenantDates(data);
    } catch (error) {
      console.error("Error creating tenant:", error);
      throw error;
    }
  }

  async updateTenant(
    id: string,
    tenantData: UpdateTenantRequest
  ): Promise<Tenant> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.TENANTS}/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(tenantData),
        }
      );

      const data = await this.handleResponse<any>(response);
      return this.parseTenantDates(data);
    } catch (error) {
      console.error("Error updating tenant:", error);
      throw error;
    }
  }

  async deleteTenant(id: string): Promise<void> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.TENANTS}/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to delete tenant: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      throw error;
    }
  }

  async getTenantStats(): Promise<{
    total: number;
    totalTenants: number;
  }> {
    try {
      const tenants = await this.getTenants();
      return {
        total: tenants.length,
        totalTenants: tenants.length,
      };
    } catch (error) {
      console.error("Error fetching tenant stats:", error);
      throw error;
    }
  }
}

export const tenantService = new TenantService();
