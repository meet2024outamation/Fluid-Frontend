const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7253";

export interface ApiClient {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateClientRequest {
  name: string;
  code: string;
  isActive: boolean;
}

export interface UpdateClientRequest {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface AssignSchemasRequest {
  clientId: number;
  schemaIds: number[];
}

class ClientService {
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

  async getClients(): Promise<ApiClient[]> {
    const url = `${API_BASE_URL}/api/clients`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<ApiClient[]>(response);
  }

  async getAllClients(): Promise<ApiClient[]> {
    try {
      // The API returns all clients directly, no pagination needed
      return await this.getClients();
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      return [];
    }
  }

  async getClientById(id: number): Promise<ApiClient> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<ApiClient>(response);
  }

  async createClient(request: CreateClientRequest): Promise<ApiClient> {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Name: request.name,
        Code: request.code,
        IsActive: request.isActive,
      }),
    });

    return this.handleResponse<ApiClient>(response);
  }

  async updateClient(request: UpdateClientRequest): Promise<ApiClient> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${request.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Name: request.name,
        Code: request.code,
        IsActive: request.isActive,
      }),
    });

    return this.handleResponse<ApiClient>(response);
  }

  async deleteClient(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  async toggleClientStatus(id: number, isActive: boolean): Promise<ApiClient> {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        IsActive: isActive,
      }),
    });

    return this.handleResponse<ApiClient>(response);
  }

  async assignSchemas(request: AssignSchemasRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/clients/assign-schemas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ClientId: request.clientId,
        SchemaIds: request.schemaIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  validateClient(client: CreateClientRequest | UpdateClientRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate client name
    if (!client.name || client.name.trim().length === 0) {
      errors.push("Client name is required");
    } else if (client.name.length > 255) {
      errors.push("Client name must be 255 characters or less");
    }

    // Validate client code
    if (!client.code || client.code.trim().length === 0) {
      errors.push("Client code is required");
    } else if (client.code.length > 50) {
      errors.push("Client code must be 50 characters or less");
    } else if (!/^[A-Z0-9_-]+$/i.test(client.code)) {
      errors.push(
        "Client code can only contain letters, numbers, underscores, and hyphens"
      );
    }

    return { isValid: errors.length === 0, errors };
  }
}

export const clientService = new ClientService();
