import type { Order, OrderStatus, OrderPriority } from "../types";
import type { OrderListResponse } from "../services/orderService";

export const mapApiOrderToOrder = (apiOrder: OrderListResponse): Order => {
  // Map priority number to priority string
  const getPriorityString = (priority: number): OrderPriority => {
    switch (priority) {
      case 1:
        return "Low";
      case 2:
        return "Normal";
      case 3:
        return "High";
      case 4:
        return "Urgent";
      default:
        return "Normal";
    }
  };

  // Map status string to our status type
  const getStatusString = (status: string): OrderStatus => {
    switch (status.toLowerCase()) {
      case "pending":
        return "Pending";
      case "assigned":
        return "Assigned";
      case "in progress":
      case "inprogress":
      case "processing":
        return "In Progress";
      case "completed":
        return "Completed";
      case "flagged":
        return "Flagged";
      default:
        return "Pending";
    }
  };

  return {
    id: `ORD-${apiOrder.id}`,
    batchId: `BTH-${apiOrder.batchId}`,
    status: getStatusString(apiOrder.status),
    priority: getPriorityString(apiOrder.priority),
    assignedTo: apiOrder.assignedTo ? Number(apiOrder.assignedTo) : undefined,
    assignedUserName: apiOrder.assignedUserName,
    assignedAt: apiOrder.assignedAt ? new Date(apiOrder.assignedAt) : undefined,
    startedAt: apiOrder.startedAt ? new Date(apiOrder.startedAt) : undefined,
    completedAt: apiOrder.completedAt
      ? new Date(apiOrder.completedAt)
      : undefined,
    createdAt: new Date(apiOrder.createdAt),
    updatedAt: new Date(apiOrder.updatedAt),
    estimatedTime: Math.ceil(apiOrder.fieldCount * 0.5), // Estimate 30 seconds per field
    documents: [
      {
        id: `doc-${apiOrder.id}`,
        name: apiOrder.batchFileName || `batch_${apiOrder.batchId}.pdf`,
        type: "PDF",
        url: `/docs/batch_${apiOrder.batchId}.pdf`,
        pages: Math.ceil(apiOrder.documentCount / 2), // Estimate pages
        uploadedAt: new Date(apiOrder.createdAt),
      },
    ],
    keyingData: {},
    // Additional fields from API
    projectId: apiOrder.projectId,
    projectName: apiOrder.projectName,
    hasValidationErrors: apiOrder.hasValidationErrors,
    documentCount: apiOrder.documentCount,
    fieldCount: apiOrder.fieldCount,
    verifiedFieldCount: apiOrder.verifiedFieldCount,
    completionPercentage: apiOrder.completionPercentage,
  };
};

export const getPriorityNumber = (priority: OrderPriority): number => {
  switch (priority) {
    case "Low":
      return 1;
    case "Normal":
      return 2;
    case "High":
      return 3;
    case "Urgent":
      return 4;
    default:
      return 2;
  }
};
