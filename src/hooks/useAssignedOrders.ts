import { useState, useEffect, useCallback } from "react";
import { orderService } from "../services/orderService";
import type { Order, FetchOrdersParams } from "../services/orderService";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import { useAuth } from "../contexts/AuthContext";

export interface UseAssignedOrdersState {
  assignedOrders: Order[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseAssignedOrdersActions {
  fetchAssignedOrders: () => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export interface UseAssignedOrdersReturn
  extends UseAssignedOrdersState,
    UseAssignedOrdersActions {}

export const useAssignedOrders = (): UseAssignedOrdersReturn => {
  const { selectedProjectId } = useTenantSelection();
  const { meDataLoaded, currentUser } = useAuth();

  const [state, setState] = useState<UseAssignedOrdersState>({
    assignedOrders: [],
    totalCount: 0,
    isLoading: false,
    error: null,
  });

  const fetchAssignedOrders = useCallback(async () => {
    if (!meDataLoaded || !currentUser?.id) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const fetchParams: FetchOrdersParams = {
        assignedTo: currentUser.id,
        pageSize: 100, // Get more orders for dashboard overview
      };

      // Add projectId if available (for non-admin users)
      if (selectedProjectId) {
        fetchParams.projectId = selectedProjectId;
      }

      const response = await orderService.fetchOrders(fetchParams);

      setState((prev) => ({
        ...prev,
        assignedOrders: response.orders,
        totalCount: response.totalCount,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned orders";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [selectedProjectId, meDataLoaded, currentUser?.id]);

  const refetch = useCallback(() => {
    return fetchAssignedOrders();
  }, [fetchAssignedOrders]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (currentUser?.id && meDataLoaded) {
      fetchAssignedOrders();
    }
  }, [currentUser?.id, meDataLoaded, selectedProjectId, fetchAssignedOrders]);

  return {
    ...state,
    fetchAssignedOrders,
    refetch,
    clearError,
  };
};
