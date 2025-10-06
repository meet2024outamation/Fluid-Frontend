import React, { useState } from "react";
import { useFetchOrders, type AssignmentFilter } from "../hooks/useFetchOrders";
import { useOrderStatuses } from "../hooks/useOrderStatuses";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import type { Order } from "../services/orderService";
import { useNavigate } from "react-router-dom";

const OrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    orders,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    isInitialLoading,
    setPage,
    setSearch,
    setStatus,
    setAssignmentFilter,
    assignToMe,
    clearError,
  } = useFetchOrders();

  const {
    statuses: orderStatuses,
    isLoading: statusesLoading,
    error: statusesError,
  } = useOrderStatuses();

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignmentFilterValue, setAssignmentFilterValue] =
    useState<AssignmentFilter>("all");
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);

  const handleAssignToMe = async (orderId: number) => {
    if (!currentUser?.id) {
      // Could add a toast notification here
      console.error("User not available for assignment");
      return;
    }

    setAssigningOrderId(orderId);
    try {
      await assignToMe(orderId);
      // Success notification could be added here
      console.log("Order successfully assigned to you");
    } catch (error) {
      console.error("Failed to assign order:", error);
      // Error is already handled by the hook
    } finally {
      setAssigningOrderId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    // Debounced search happens automatically in the hook
    setSearch(value.trim());
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setStatus(status);
  };

  const handleAssignmentFilterChange = (filter: AssignmentFilter) => {
    setAssignmentFilterValue(filter);
    setAssignmentFilter(filter);
  };

  const handleViewOrder = (orderId: number) => {
    navigate(`/orders/${orderId}`);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    // Enhanced status colors that handle more variations
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      "in-progress": "bg-blue-100 text-blue-800",
      inprogress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      finished: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      canceled: "bg-gray-100 text-gray-800",
      readyforai: "bg-purple-100 text-purple-800",
      "ready-for-ai": "bg-purple-100 text-purple-800",
      "ready for ai": "bg-purple-100 text-purple-800",
      assigned: "bg-indigo-100 text-indigo-800",
      unassigned: "bg-gray-100 text-gray-800",
      new: "bg-blue-50 text-blue-700",
      draft: "bg-gray-50 text-gray-600",
    };

    const normalizedStatus = status.toLowerCase().replace(/[\s_-]+/g, "");
    const colorClass =
      statusColors[normalizedStatus as keyof typeof statusColors] ||
      "bg-gray-100 text-gray-800";

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: number) => {
    let priorityText = "";
    let colorClass = "";

    switch (priority) {
      case 1:
        priorityText = "Critical";
        colorClass = "bg-red-100 text-red-800";
        break;
      case 2:
        priorityText = "High";
        colorClass = "bg-orange-100 text-orange-800";
        break;
      case 3:
        priorityText = "Medium";
        colorClass = "bg-yellow-100 text-yellow-800";
        break;
      case 4:
        priorityText = "Low";
        colorClass = "bg-green-100 text-green-800";
        break;
      case 5:
        priorityText = "Lowest";
        colorClass = "bg-gray-100 text-gray-800";
        break;
      default:
        priorityText = `P${priority}`;
        colorClass = "bg-gray-100 text-gray-800";
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {priorityText}
      </span>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }

    // Next button
    pages.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    );

    return <div className="flex gap-2 justify-center mt-6">{pages}</div>;
  };

  if (isInitialLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg text-gray-600">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
        <p className="text-gray-600">
          Manage and view all orders for the current project
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-red-800 font-medium mb-1">
                  Error Loading Orders
                </h3>
                <p className="text-red-700">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="text-red-600 border-red-300 hover:bg-red-100"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search orders by identifier, batch name, or project..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" disabled={isLoading}>
                  Search
                </Button>
              </div>
            </form>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">All Statuses</option>
                {statusesLoading ? (
                  <option disabled>Loading statuses...</option>
                ) : statusesError ? (
                  <option disabled>Failed to load statuses</option>
                ) : (
                  orderStatuses.map((status) => (
                    <option key={status.id} value={status.name}>
                      {status.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-medium text-gray-700">
                  Order ID
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Batch Name
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Project
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Status
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Priority
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Documents
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Progress
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Assigned To
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Created
                </th>
                <th className="text-left p-4 font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <div className="text-gray-600">Loading orders...</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8">
                    <div className="text-gray-600">
                      {searchInput || statusFilter
                        ? "No orders found matching your criteria."
                        : "No orders found for this project."}
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order: Order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-bold text-blue-600">
                          {order.orderIdentifier}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {order.id}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">
                        {order.batchFileName || "N/A"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {order.projectName || "N/A"}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4">{getPriorityBadge(order.priority)}</td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium">{order.documentCount}</div>
                        <div className="text-xs text-gray-500">documents</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${order.completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 font-medium min-w-[32px]">
                          {order.completionPercentage}%
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      {order.assignedUserName ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {order.assignedUserName}
                          </div>
                          {order.assignedAt && (
                            <div className="text-xs text-gray-500">
                              {formatDate(order.assignedAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {/* Show AssignToMe button only for unassigned orders */}
                        {!order.assignedTo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignToMe(order.id)}
                            disabled={assigningOrderId === order.id}
                          >
                            {assigningOrderId === order.id
                              ? "Assigning..."
                              : "Assign to Me"}
                          </Button>
                        )}

                        {/* Always show View button */}
                        <Button
                          variant={
                            order.assignedTo === currentUser?.id
                              ? "default"
                              : "ghost"
                          }
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination and Count */}
        {orders.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {orders.length} of {totalCount} orders
              </div>
              {renderPagination()}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OrdersPage;
