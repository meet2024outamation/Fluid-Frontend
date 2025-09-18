import type { User, UserRequest, CreateUserRequest } from "../types";
import { API_CONFIG, apiRequest } from "../config/api";

export interface UserFilters {
  search?: string;
  isActive?: boolean;
}

class UserService {
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
  private parseUserDates(user: any): User {
    return {
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
    };
  }

  async getUsers(filters?: UserFilters): Promise<User[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) {
        queryParams.append("search", filters.search);
      }
      if (filters?.isActive !== undefined) {
        queryParams.append("isActive", filters.isActive.toString());
      }

      const endpoint = queryParams.toString()
        ? `${API_CONFIG.ENDPOINTS.USERS}?${queryParams.toString()}`
        : API_CONFIG.ENDPOINTS.USERS;

      const response = await apiRequest(endpoint, {
        method: "GET",
      });

      const data = await this.handleResponse<any[]>(response);
      return data.map((user: any) => this.parseUserDates(user));
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
        method: "GET",
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      const data = await this.handleResponse<any>(response);
      return this.parseUserDates(data);
    } catch (error) {
      console.error("Error fetching user by id:", error);
      throw error;
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.USERS, {
        method: "POST",
        body: JSON.stringify(userData),
      });

      const data = await this.handleResponse<any>(response);
      return this.parseUserDates(data);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, userData: UserRequest): Promise<User> {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      const data = await this.handleResponse<any>(response);
      return this.parseUserDates(data);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.USERS}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to delete user: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    try {
      const users = await this.getUsers();
      const active = users.filter((u) => u.isActive).length;
      const inactive = users.filter((u) => !u.isActive).length;

      return {
        total: users.length,
        active,
        inactive,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw error;
    }
  }
}

export const userService = new UserService();
