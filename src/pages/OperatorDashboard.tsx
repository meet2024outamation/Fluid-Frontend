import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Play,
  Eye,
  Package,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../contexts/AuthContext";
import type { Order, OrderStatus, OrderPriority } from "../types";
import { orderService, type OrderFilters } from "../services/orderService";
import { mapApiOrderToOrder, getPriorityNumber } from "../utils/orderUtils";

const OperatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | "All">(
    "All"
  );
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: OrderFilters = {
        pageNumber: currentPage,
        pageSize: pageSize,
      };

      if (statusFilter !== "All") {
        filters.status = statusFilter;
      }

      if (priorityFilter !== "All") {
        filters.priority = getPriorityNumber(priorityFilter);
      }

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      const response = await orderService.getOrders(filters);

      const mappedOrders = response.orders.map(mapApiOrderToOrder);
      setOrders(mappedOrders);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
      setCurrentPage(response.pageNumber);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch orders"
      );
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, priorityFilter, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchOrders();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchOrders();
    }
  }, [statusFilter, priorityFilter]);

  const handleAssignToMe = async (orderId: string) => {
    try {
      // Simulate API call to assign order
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "Assigned",
                assignedTo: user?.id,
                assignedAt: new Date(),
              }
            : order
        )
      );

      // In a real app, this would make an API call
      console.log(
        `Order ${orderId} assigned to ${user ? `${user.firstName} ${user.lastName}` : "Unknown User"}`
      );
    } catch (error) {
      console.error("Failed to assign order:", error);
    }
  };

  const handleStartProcessing = async (orderId: string) => {
    try {
      // Simulate API call to start processing
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "In Progress" } : order
        )
      );

      // In a real app, this would navigate to the order processing page
      console.log(`Started processing order ${orderId}`);
    } catch (error) {
      console.error("Failed to start processing:", error);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "Assigned":
        return <User className="h-4 w-4 text-blue-500" />;
      case "In Progress":
        return <Play className="h-4 w-4 text-green-500" />;
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Flagged":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: OrderPriority) => {
    switch (priority) {
      case "Urgent":
        return "bg-red-100 text-red-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Normal":
        return "bg-blue-100 text-blue-800";
      case "Low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  // Statistics for dashboard
  const stats = {
    availableOrders: orders.filter((o) => o.status === "Pending").length,
    myAssignedOrders: orders.filter(
      (o) => o.assignedTo === user?.id && o.status === "Assigned"
    ).length,
    inProgressOrders: orders.filter(
      (o) => o.assignedTo === user?.id && o.status === "In Progress"
    ).length,
    completedToday: orders.filter(
      (o) => o.assignedTo === user?.id && o.status === "Completed"
    ).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Operator Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your order queue and process documents efficiently.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableOrders}</div>
            <p className="text-xs text-muted-foreground">Ready to assign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Assigned</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myAssignedOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Queue
              </CardTitle>
              <CardDescription>
                Available orders ready for processing. Click "Assign to Me" to
                claim an order.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search orders, batches, or documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OrderStatus | "All")
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as OrderPriority | "All")
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Priority</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">
                No orders found
              </p>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order: Order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="font-medium">{order.id}</span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}
                      >
                        {order.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {order.status === "Pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleAssignToMe(order.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Assign to Me
                        </Button>
                      )}
                      {order.status === "Assigned" &&
                        order.assignedTo === user?.id && (
                          <Button
                            size="sm"
                            onClick={() => handleStartProcessing(order.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start Processing
                          </Button>
                        )}
                      {order.status === "In Progress" &&
                        order.assignedTo === user?.id && (
                          <Button size="sm" variant="outline">
                            Continue
                          </Button>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Batch ID</p>
                      <p className="font-medium">{order.batchId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Documents</p>
                      <p className="font-medium">
                        {order.documents.length} file(s)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.documents.map((doc: any) => doc.name).join(", ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estimated Time
                      </p>
                      <p className="font-medium">
                        {order.estimatedTime} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created {formatTimeAgo(order.createdAt)}
                      </div>
                      {order.assignedAt && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Assigned {formatTimeAgo(order.assignedAt)}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status:{" "}
                      <span className="font-medium">{order.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center p-8 text-red-600">
              <div className="text-center">
                <p className="font-medium">Error loading orders</p>
                <p className="text-sm mt-1">{error}</p>
                <Button
                  onClick={() => fetchOrders()}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && orders.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-muted-foreground">
                Showing {orders.length} of {totalCount} orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage >= totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Order Details - ${selectedOrder?.id}`}
        maxWidth="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Order ID
                </label>
                <p className="text-sm text-gray-900">{selectedOrder.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Batch ID
                </label>
                <p className="text-sm text-gray-900">{selectedOrder.batchId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedOrder.status)}
                  <span className="text-sm">{selectedOrder.status}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Priority
                </label>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedOrder.priority)}`}
                >
                  {selectedOrder.priority}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Estimated Time
                </label>
                <p className="text-sm text-gray-900">
                  {selectedOrder.estimatedTime} minutes
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {selectedOrder.createdAt.toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Documents
              </label>
              <div className="space-y-2">
                {selectedOrder.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.pages} pages • {doc.type}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.assignedTo === user?.id && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedOrder.status === "Assigned" && (
                  <Button
                    onClick={() => {
                      handleStartProcessing(selectedOrder.id);
                      handleCloseModal();
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Processing
                  </Button>
                )}
                {selectedOrder.status === "In Progress" && (
                  <Button variant="outline">Continue Processing</Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OperatorDashboard;
