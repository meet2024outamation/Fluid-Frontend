import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  orderService,
  type OrderDto,
  type DocumentResponse,
} from "../services/orderService";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeft,
  FileText,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No order ID provided");
      setIsLoading(false);
      return;
    }

    fetchOrderDetails(parseInt(id, 10));
  }, [id]);

  const fetchOrderDetails = async (orderId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const orderData = await orderService.getOrderDetails(orderId);
      setOrder(orderData);
    } catch (err) {
      console.error("Failed to fetch order details:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load order details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
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

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "Unknown size";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 10) / 10 + " " + sizes[i];
  };

  const getStatusBadge = (status: string) => {
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
    };

    const normalizedStatus = status.toLowerCase().replace(/[\\s_-]+/g, "");
    const colorClass =
      statusColors[normalizedStatus as keyof typeof statusColors] ||
      "bg-gray-100 text-gray-800";

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const priorityConfig = {
      1: { text: "Critical", class: "bg-red-100 text-red-800" },
      2: { text: "High", class: "bg-orange-100 text-orange-800" },
      3: { text: "Medium", class: "bg-yellow-100 text-yellow-800" },
      4: { text: "Low", class: "bg-green-100 text-green-800" },
      5: { text: "Lowest", class: "bg-gray-100 text-gray-800" },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || {
      text: `P${priority}`,
      class: "bg-gray-100 text-gray-800",
    };

    return (
      <span className={`px-2 py-1 rounded text-sm font-medium ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const handleDocumentClick = (document: DocumentResponse) => {
    if (document.url) {
      window.open(document.url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg text-gray-600">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={() => navigate("/orders")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Order not found</div>
          <Button onClick={() => navigate("/orders")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => navigate("/orders")}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Order Details: {order.orderIdentifier}
            </h1>
            <p className="text-gray-600 mt-1">
              ID: {order.id} • {order.projectName} • {order.batchName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Identifier
                  </label>
                  <div className="text-lg font-mono font-bold text-blue-600">
                    {order.orderIdentifier}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div>{getStatusBadge(order.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <div>{getPriorityBadge(order.priority)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <div className="font-medium">{order.projectName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch
                  </label>
                  <div className="font-medium">{order.batchName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <div>{formatDate(order.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment & Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <div className="font-medium">
                    {order.assignedUserName ? (
                      <div>
                        <div>{order.assignedUserName}</div>
                        <div className="text-sm text-gray-500">
                          Assigned: {formatDate(order.assignedAt)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progress
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${order.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium min-w-[48px]">
                      {order.completionPercentage}%
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Started
                  </label>
                  <div>{formatDate(order.startedAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Completed
                  </label>
                  <div>{formatDate(order.completedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Errors Card */}
          {order.hasValidationErrors && order.validationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Validation Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {order.validationErrors.map((error, index) => (
                    <li key={index} className="text-red-700 text-sm">
                      • {error}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Sidebar */}
        <div className="space-y-6">
          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {order.documentCount}
                </div>
                <div className="text-sm text-gray-600">Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {order.fieldCount}
                </div>
                <div className="text-sm text-gray-600">Total Fields</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {order.verifiedFieldCount}
                </div>
                <div className="text-sm text-gray-600">Verified Fields</div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!order.assignedTo && (
                <Button
                  className="w-full"
                  onClick={() => {
                    // Handle assignment - would need to implement this
                    console.log("Assign order to me");
                  }}
                >
                  Assign to Me
                </Button>
              )}

              {order.assignedTo === currentUser?.id && (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => {
                    // Handle start processing
                    console.log("Start processing");
                  }}
                >
                  Start Processing
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Handle refresh
                  if (order.id) fetchOrderDetails(order.id);
                }}
              >
                Refresh Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documents Section */}
      {order.documents && order.documents.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents ({order.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 font-medium text-gray-700">
                        Name
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Type
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Pages
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Size
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Searchable
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Created
                      </th>
                      <th className="text-left p-3 font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.documents.map((document) => (
                      <tr
                        key={document.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          document.hasSearchableText ? "bg-green-50" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-medium">{document.name}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600">
                            {document.type || "Unknown"}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-mono">
                            {document.pages}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {document.fileSizeFormatted ||
                              formatFileSize(document.fileSizeBytes)}
                          </div>
                        </td>
                        <td className="p-3">
                          {document.hasSearchableText ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-gray-400 text-sm">No</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-gray-600">
                            {formatDate(document.createdAt)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {document.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDocumentClick(document)}
                                title="Open document"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                            {document.searchableUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  window.open(document.searchableUrl, "_blank")
                                }
                                title="Open searchable version"
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
