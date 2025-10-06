import { useState, useEffect } from "react";
import { orderService, type OrderStatus } from "../services/orderService";

interface UseOrderStatusesResult {
  statuses: OrderStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useOrderStatuses = (): UseOrderStatusesResult => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedStatuses = await orderService.getOrderStatuses();
      setStatuses(fetchedStatuses);
    } catch (err) {
      console.error("Failed to fetch order statuses:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch order statuses"
      );
      // Set fallback statuses in case of API failure
      setStatuses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const refetch = () => {
    fetchStatuses();
  };

  return {
    statuses,
    isLoading,
    error,
    refetch,
  };
};
