import { API_CONFIG, apiRequest } from "../config/api";

export interface ApiProject {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  isActive: boolean;
}

export interface UpdateProjectRequest {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface AssignSchemasRequest {
  projectId: number;
  schemaIds: number[];
}

class ProjectService {
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

  async getProjects(): Promise<ApiProject[]> {
    const response = await apiRequest(API_CONFIG.ENDPOINTS.PROJECTS, {
      method: "GET",
    });

    return this.handleResponse<ApiProject[]>(response);
  }

  async getAllProjects(): Promise<ApiProject[]> {
    try {
      // The API returns all projects directly, no pagination needed
      return await this.getProjects();
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      return [];
    }
  }

  async getProjectById(id: number): Promise<ApiProject> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`,
      {
        method: "GET",
      }
    );

    return this.handleResponse<ApiProject>(response);
  }

  async createProject(request: CreateProjectRequest): Promise<ApiProject> {
    const response = await apiRequest(API_CONFIG.ENDPOINTS.PROJECTS, {
      method: "POST",
      body: JSON.stringify({
        Name: request.name,
        Code: request.code,
        IsActive: request.isActive,
      }),
    });

    return this.handleResponse<ApiProject>(response);
  }

  async updateProject(request: UpdateProjectRequest): Promise<ApiProject> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.PROJECTS}/${request.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          Name: request.name,
          Code: request.code,
          IsActive: request.isActive,
        }),
      }
    );

    return this.handleResponse<ApiProject>(response);
  }

  async deleteProject(id: number): Promise<void> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  async toggleProjectStatus(
    id: number,
    isActive: boolean
  ): Promise<ApiProject> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.PROJECTS}/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          IsActive: isActive,
        }),
      }
    );

    return this.handleResponse<ApiProject>(response);
  }

  async assignSchemas(request: AssignSchemasRequest): Promise<void> {
    const response = await apiRequest(
      API_CONFIG.ENDPOINTS.PROJECTS_ASSIGN_SCHEMAS,
      {
        method: "POST",
        body: JSON.stringify({
          ProjectId: request.projectId,
          SchemaIds: request.schemaIds,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  validateProject(project: CreateProjectRequest | UpdateProjectRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate project name
    if (!project.name || project.name.trim().length === 0) {
      errors.push("Project name is required");
    } else if (project.name.length > 255) {
      errors.push("Project name must be 255 characters or less");
    }

    // Validate project code
    if (!project.code || project.code.trim().length === 0) {
      errors.push("Project code is required");
    } else if (project.code.length > 50) {
      errors.push("Project code must be 50 characters or less");
    } else if (!/^[A-Z0-9_-]+$/i.test(project.code)) {
      errors.push(
        "Project code can only contain letters, numbers, underscores, and hyphens"
      );
    }

    return { isValid: errors.length === 0, errors };
  }
}

export const projectService = new ProjectService();
