import { API_CONFIG, apiRequest } from "../config/api";

export interface OrderListResponse {
  id: number;
  orderIdentifier: string;
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

// Enhanced interfaces matching backend API response
export interface Order {
  id: number;
  orderIdentifier: string;
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

export interface OrdersResponse {
  orders: Order[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FetchOrdersParams {
  projectId?: number;
  assignedTo?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: number;
}

export interface AssignOrderParams {
  orderId: number;
  userId: number;
}

export interface OrderStatus {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// New interfaces matching the API response from api/orders/{id}
export interface DocumentResponse {
  id: number;
  name: string;
  type?: string;
  url: string;
  blobName?: string;
  searchableUrl?: string;
  searchableBlobName?: string;
  pages: number;
  hasSearchableText: boolean;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  createdAt: string;
}

export interface OrderDto {
  id: number;
  orderIdentifier: string;
  batchId: number;
  batchName: string;
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
  validationErrors: string[];
  documentCount: number;
  fieldCount: number;
  verifiedFieldCount: number;
  completionPercentage: number;
  createdAt: string;
  updatedAt?: string;
  documents: DocumentResponse[];
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
    return this.assignOrder({ orderId, userId });
  }

  // New method to assign order with proper API structure
  async assignOrder(params: AssignOrderParams): Promise<void> {
    const { orderId, userId } = params;

    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.ORDERS}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ orderId, userId }),
          includeTenant: true,
          includeProject: true,
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
    } catch (error) {
      console.error("Error assigning order:", error);
      throw error;
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

  // Enhanced orders functionality with proper tenant/project context
  async fetchOrders(params: FetchOrdersParams = {}): Promise<OrdersResponse> {
    const {
      projectId,
      assignedTo,
      page = 1,
      pageSize = 10,
      search,
      status,
      priority,
    } = params;

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    // Add optional parameters
    if (projectId) {
      queryParams.append("projectId", projectId.toString());
    }
    if (assignedTo) {
      queryParams.append("assignedTo", assignedTo.toString());
    }
    if (search) {
      queryParams.append("search", search);
    }
    if (status) {
      queryParams.append("status", status);
    }
    if (priority !== undefined) {
      queryParams.append("priority", priority.toString());
    }

    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.ORDERS}?${queryParams.toString()}`;
      const response = await apiRequest(endpoint, {
        method: "GET",
        includeTenant: true,
        includeProject: true,
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Return empty response for no orders found
          return {
            orders: [],
            totalCount: 0,
            pageSize,
            currentPage: page,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          };
        }

        const errorText = await response.text();
        throw new Error(
          `Failed to fetch orders: ${response.status} - ${errorText}`
        );
      }

      const data: OrdersResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  }

  async getOrderById(orderId: number): Promise<Order> {
    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}`;
      const response = await apiRequest(endpoint, {
        method: "GET",
        includeTenant: true,
        includeProject: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch order: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  }

  // Get detailed order information with documents from api/orders/{id}
  async getOrderDetails(orderId: number): Promise<OrderDto> {
    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}`;
      const response = await apiRequest(endpoint, {
        method: "GET",
        includeTenant: true,
        includeProject: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch order details: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching order details:", error);
      throw error;
    }
  }

  async getOrderStatuses(): Promise<OrderStatus[]> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.ORDER_STATUSES;
      const response = await apiRequest(endpoint, {
        method: "GET",
        includeTenant: true,
        includeProject: true,
      });

      if (!response.ok) {
        // If 404, the endpoint might not exist yet, use fallback
        if (response.status === 404) {
          console.warn(
            "Order statuses endpoint not found, using fallback statuses"
          );
          return [];
        }

        const errorText = await response.text();
        throw new Error(
          `Failed to fetch order statuses: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.statuses)) {
        return data.statuses;
      } else if (data && data.data && Array.isArray(data.data)) {
        return data.data;
      }

      // If unexpected format, return fallback
      console.warn("Unexpected order statuses response format, using fallback");
      return [];
    } catch (error) {
      console.error("Error fetching order statuses:", error);
      // Return fallback statuses in case of API failure
      return [];
    }
  }

  // // Fallback statuses in case API is not available
  // private getFallbackOrderStatuses(): OrderStatus[] {
  //   return [
  //     { value: "ReadyForAI", label: "Ready for AI" },
  //     { value: "pending", label: "Pending" },
  //     { value: "processing", label: "Processing" },
  //     { value: "completed", label: "Completed" },
  //     { value: "failed", label: "Failed" },
  //     { value: "cancelled", label: "Cancelled" },
  //   ];
  // }
}

export const orderService = new OrderService();
