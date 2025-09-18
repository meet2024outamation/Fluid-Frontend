import { API_CONFIG, apiRequest } from "../config/api";

export interface OrderListResponse {
  id: number;
  batchId: number;
  batchFileName: string;
  projectId: number;
  projectName: string;
  status: string;
  priority: number;
  assignedTo?: number;
  assignedUserName?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  hasValidationErrors: boolean;
  documentCount: number;
  fieldCount: number;
  verifiedFieldCount: number;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListPagedResponse {
  orders: OrderListResponse[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OrderFilters {
  status?: string;
  priority?: number;
  assignedTo?: number;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

class OrderService {
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

  async getOrders(filters: OrderFilters = {}): Promise<OrderListPagedResponse> {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.priority !== undefined)
      params.append("priority", filters.priority.toString());
    if (filters.assignedTo)
      params.append("assignedTo", filters.assignedTo.toString());
    if (filters.search) params.append("search", filters.search);
    if (filters.pageNumber)
      params.append("pageNumber", filters.pageNumber.toString());
    if (filters.pageSize)
      params.append("pageSize", filters.pageSize.toString());

    const endpoint = `${API_CONFIG.ENDPOINTS.ORDERS}?${params}`;
    const response = await apiRequest(endpoint, {
      method: "GET",
    });

    return this.handleResponse<OrderListPagedResponse>(response);
  }

  async assignOrderToMe(orderId: number, userId: number): Promise<void> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/assign`,
      {
        method: "POST",
        body: JSON.stringify({ assignedTo: userId }),
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

  async startProcessing(orderId: number): Promise<void> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/start`,
      {
        method: "POST",
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
}

export const orderService = new OrderService();
