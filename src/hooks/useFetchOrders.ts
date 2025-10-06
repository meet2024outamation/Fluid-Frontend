import { useState, useEffect, useCallback, useRef } from "react";
import { orderService } from "../services/orderService";
import type { Order, FetchOrdersParams } from "../services/orderService";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import { useAuth } from "../contexts/AuthContext";

// Assignment filter types
export type AssignmentFilter = "all" | "unassigned" | "assignedToMe";

export interface UseFetchOrdersState {
  orders: Order[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  isInitialLoading: boolean;
}

export interface UseFetchOrdersActions {
  fetchOrders: (params?: Partial<FetchOrdersParams>) => Promise<void>;
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setAssignmentFilter: (filter: AssignmentFilter) => void;
  assignToMe: (orderId: number) => Promise<void>;
  clearError: () => void;
}

export interface UseFetchOrdersReturn
  extends UseFetchOrdersState,
    UseFetchOrdersActions {}

export interface UseFetchOrdersOptions {
  assignedTo?: number;
  includeTenantHeaders?: boolean;
}

export const useFetchOrders = (
  options?: UseFetchOrdersOptions
): UseFetchOrdersReturn => {
  const { selectedProjectId, selectedTenantIdentifier } = useTenantSelection();
  const { meDataLoaded, currentUser } = useAuth();

  const [state, setState] = useState<UseFetchOrdersState>({
    orders: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    pageSize: 10,
    isLoading: false,
    error: null,
    isInitialLoading: true,
  });

  const [searchParams, setSearchParams] = useState({
    search: "",
    status: "",
    assignmentFilter: "all" as AssignmentFilter,
    page: 1,
  });

  // Debounce timer for search
  const searchDebounceRef = useRef<number | null>(null);

  const fetchOrders = useCallback(
    async (params?: Partial<FetchOrdersParams>) => {
      // For assigned orders, we need currentUser.id, for all orders we need projectId
      if (
        !meDataLoaded ||
        (options?.assignedTo && !currentUser?.id) ||
        (!options?.assignedTo && !selectedProjectId)
      ) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const fetchParams: FetchOrdersParams = {
          page: searchParams.page,
          pageSize: state.pageSize,
          search: searchParams.search || undefined,
          status: searchParams.status || undefined,
          ...params,
        };

        // Handle assignment filtering
        if (options?.assignedTo && currentUser?.id) {
          // For dashboard - always filter by assignedTo
          fetchParams.assignedTo = currentUser.id;
        } else if (
          searchParams.assignmentFilter === "assignedToMe" &&
          currentUser?.id
        ) {
          // User selected "Assigned to Me" filter
          fetchParams.assignedTo = currentUser.id;
        } else if (searchParams.assignmentFilter === "unassigned") {
          // User selected "Unassigned" filter - set assignedTo to 0 or null
          fetchParams.assignedTo = 0;
        }
        // If 'all' is selected, don't add assignedTo filter

        if (selectedProjectId && !options?.assignedTo) {
          fetchParams.projectId = selectedProjectId;
        }

        const response = await orderService.fetchOrders(fetchParams);

        setState((prev) => ({
          ...prev,
          orders: response.orders,
          totalCount: response.totalCount,
          currentPage: response.currentPage,
          totalPages: response.totalPages,
          pageSize: response.pageSize,
          isLoading: false,
          isInitialLoading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch orders";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isInitialLoading: false,
          error: errorMessage,
        }));
      }
    },
    [
      selectedProjectId,
      selectedTenantIdentifier,
      meDataLoaded,
      currentUser?.id,
      options?.assignedTo,
      searchParams,
      state.pageSize,
    ]
  );

  const refetch = useCallback(() => {
    return fetchOrders();
  }, [fetchOrders]);

  const setPage = useCallback((page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  }, []);

  const setSearch = useCallback((search: string) => {
    // Clear existing debounce timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Set new timer for debounced search
    searchDebounceRef.current = setTimeout(() => {
      setSearchParams((prev) => ({ ...prev, search, page: 1 })); // Reset to first page on search
    }, 300); // 300ms debounce
  }, []);

  const setStatus = useCallback((status: string) => {
    setSearchParams((prev) => ({ ...prev, status, page: 1 })); // Reset to first page on filter
  }, []);

  const setAssignmentFilter = useCallback(
    (assignmentFilter: AssignmentFilter) => {
      setSearchParams((prev) => ({ ...prev, assignmentFilter, page: 1 })); // Reset to first page on filter
    },
    []
  );

  const assignToMe = useCallback(
    async (orderId: number) => {
      if (!currentUser?.id) {
        throw new Error("User ID not available");
      }

      try {
        await orderService.assignOrder({ orderId, userId: currentUser.id });
        // Refresh the orders list after successful assignment
        await fetchOrders();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to assign order";
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    [currentUser?.id, fetchOrders]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch when dependencies change
  useEffect(() => {
    const shouldFetch = options?.assignedTo
      ? currentUser?.id && meDataLoaded
      : selectedProjectId && selectedTenantIdentifier && meDataLoaded;

    if (shouldFetch) {
      fetchOrders();
    }
  }, [
    selectedProjectId,
    selectedTenantIdentifier,
    meDataLoaded,
    currentUser?.id,
    searchParams,
    options?.assignedTo,
    fetchOrders,
  ]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return {
    ...state,
    fetchOrders,
    refetch,
    setPage,
    setSearch,
    setStatus,
    setAssignmentFilter,
    assignToMe,
    clearError,
  };
};
