export interface OrderListResponse {
  id: number;
  batchId: number;
  batchFileName: string;
  clientId: number;
  clientName: string;
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
  private baseUrl =
    import.meta.env.VITE_API_BASE_URL || "https://localhost:7253";

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

    const response = await fetch(`${this.baseUrl}/api/orders?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    return response.json();
  }

  async assignOrderToMe(orderId: number, userId: number): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/orders/${orderId}/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignedTo: userId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to assign order: ${response.statusText}`);
    }
  }

  async startProcessing(orderId: number): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/orders/${orderId}/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to start processing: ${response.statusText}`);
    }
  }
}

export const orderService = new OrderService();
