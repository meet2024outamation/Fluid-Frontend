import { apiRequest } from "../config/api";
import type { TenantOrderFlow, OrderFlowStep, OrderStatus } from "../types";

class OrderFlowService {
  // Get all order flows (steps)
  async getOrderFlows(): Promise<OrderFlowStep[]> {
    const response = await apiRequest(`/api/order-flows`, { method: "GET" });
    return response.json();
  }
  // Get tenant order flow configuration
  async getTenantOrderFlow(tenantId: string): Promise<TenantOrderFlow> {
    const response = await apiRequest(`/api/tenantorderflow/${tenantId}`, {
      method: "GET",
    });
    return response.json();
  }

  // Create new order flow (steps only, per new API contract)
  async createOrderFlow(
    steps: { orderStatusId: number; rank: number; isActive: boolean }[]
  ): Promise<any> {
    const response = await apiRequest(`/api/order-flows`, {
      method: "POST",
      body: JSON.stringify({ steps }),
    });
    return response.json();
  }

  // Reset to default order flow
  async resetToDefaultFlow(tenantId: string): Promise<TenantOrderFlow> {
    const response = await apiRequest(
      `/api/tenantorderflow/${tenantId}/reset`,
      {
        method: "POST",
      }
    );
    return response.json();
  }

  // Get default order flow template
  async getDefaultOrderFlow(): Promise<OrderFlowStep[]> {
    const response = await apiRequest(`/api/tenantorderflow/default`, {
      method: "GET",
    });
    return response.json();
  }

  // Helper function to generate default flow steps
  getDefaultFlowSteps(): OrderFlowStep[] {
    const defaultStatuses = [
      {
        status: "Created" as OrderStatus,
        label: "Created",
        description: "Order has been created and is being validated",
      },
      {
        status: "ValidationError" as OrderStatus,
        label: "Validation Error",
        description: "Order failed validation and needs attention",
      },
      {
        status: "ReadyForAI" as OrderStatus,
        label: "Ready for AI",
        description: "Order is ready for AI processing",
      },
      {
        status: "AIProcessing" as OrderStatus,
        label: "AI Processing",
        description: "Order is being processed by AI",
      },
      {
        status: "ReadyForAssignment" as OrderStatus,
        label: "Ready for Assignment",
        description: "Order is ready to be assigned to an operator",
      },
      {
        status: "Assigned" as OrderStatus,
        label: "Assigned",
        description: "Order has been assigned to an operator",
      },
      {
        status: "InProgress" as OrderStatus,
        label: "In Progress",
        description: "Order is being worked on by an operator",
      },
      {
        status: "QCRequired" as OrderStatus,
        label: "QC Required",
        description: "Order requires quality control review",
      },
      {
        status: "Completed" as OrderStatus,
        label: "Completed",
        description: "Order has been completed successfully",
      },
      {
        status: "Error" as OrderStatus,
        label: "Error",
        description: "Order encountered an error and needs intervention",
      },
    ];

    return defaultStatuses.map((statusInfo, index) => ({
      id: `step-${statusInfo.status.toLowerCase()}`,
      status: statusInfo.status,
      rank: index + 1,
      isActive: true,
      label: statusInfo.label,
      description: statusInfo.description,
    }));
  }

  // Helper function to validate order flow
  validateOrderFlow(steps: OrderFlowStep[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for duplicate ranks
    const ranks = steps.map((step) => step.rank);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      errors.push(
        "Duplicate ranks detected - each step must have a unique rank"
      );
    }

    // Check for gaps in ranking
    const sortedRanks = ranks.slice().sort((a, b) => a - b);
    for (let i = 0; i < sortedRanks.length; i++) {
      if (sortedRanks[i] !== i + 1) {
        errors.push("Ranks must be consecutive starting from 1");
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper function to reorder steps
  reorderSteps(
    steps: OrderFlowStep[],
    startIndex: number,
    endIndex: number
  ): OrderFlowStep[] {
    const result = Array.from(steps);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    // Update ranks
    return result.map((step, index) => ({
      ...step,
      rank: index + 1,
    }));
  }
}

export const orderFlowService = new OrderFlowService();
