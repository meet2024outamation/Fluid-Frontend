import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Users,
  Package,
  FileText,
  CheckCircle,
  Database,
  Plus,
  TrendingUp,
  Clock,
  AlertTriangle,
  User,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import { useAssignedOrders } from "../hooks/useAssignedOrders";
import { useAuth } from "../contexts/AuthContext";
import type { Order } from "../services/orderService";

export const AdminDashboard: React.FC = () => {
  const { isTenantAdmin, needsTenantSelection, needsProjectSelection } =
    useTenantSelection();
  const { getUserDisplayName } = useAuth();
  const { assignedOrders, totalCount, isLoading, error } = useAssignedOrders();

  // Redirect tenant admin users to tenant selection if they haven't selected a tenant
  if (isTenantAdmin && needsTenantSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // Redirect if project selection is needed
  if (needsProjectSelection) {
    return <Navigate to="/project-selection" replace />;
  }
  // Calculate stats from assigned orders
  const stats = React.useMemo(() => {
    const pendingOrders = assignedOrders.filter(
      (order) =>
        order.status.toLowerCase() === "pending" ||
        order.status.toLowerCase() === "assigned"
    ).length;

    const inProgressOrders = assignedOrders.filter(
      (order) =>
        order.status.toLowerCase() === "processing" ||
        order.status.toLowerCase() === "in_progress"
    ).length;

    const completedOrders = assignedOrders.filter(
      (order) => order.status.toLowerCase() === "completed"
    ).length;

    return {
      totalAssigned: totalCount,
      pendingOrders,
      inProgressOrders,
      completedOrders,
    };
  }, [assignedOrders, totalCount]);

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
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      assigned: "bg-blue-100 text-blue-800",
      processing: "bg-blue-100 text-blue-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };

    const colorClass =
      statusColors[status.toLowerCase() as keyof typeof statusColors] ||
      "bg-gray-100 text-gray-800";

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Helper functions have been moved to the top of the component

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {getUserDisplayName()}! Here are your assigned orders
            and quick actions.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/orders">
            <Button variant="outline">
              <Package className="w-4 h-4 mr-2" />
              View All Orders
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Project Filter */}
      <Card className="mb-4">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by Project:</span>
            </div>
            <div className="flex-1 max-w-xs">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              >
                <option value="">All Projects</option>
                {/* TODO: Add project options when project API is available */}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {stats.totalAssigned} assigned orders
            </div>
          </div>
        </div>
      </Card>

      {/* Assigned Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assigned
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssigned}</div>
            <p className="text-xs text-muted-foreground">
              Orders assigned to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link to="/projects">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Users className="h-6 w-6 mb-2" />
                  <span>Manage Projects</span>
                </Button>
              </Link>
              <Link to="/schemas">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Database className="h-6 w-6 mb-2" />
                  <span>Schema Library</span>
                </Button>
              </Link>
              <Link to="/batches">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Package className="h-6 w-6 mb-2" />
                  <span>View Batches</span>
                </Button>
              </Link>
              <Link to="/field-mapping">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Field Mapping</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* My Assigned Orders */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Orders</CardTitle>
            <CardDescription>Orders currently assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="text-gray-600">Loading assigned orders...</div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="text-red-600">
                  Failed to load orders: {error}
                </div>
              </div>
            ) : assignedOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No orders assigned to you yet</p>
                <Link to="/orders">
                  <Button variant="outline" className="mt-4">
                    Browse Available Orders
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedOrders.slice(0, 5).map((order: Order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          #{order.id}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.batchFileName} • Created{" "}
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.priority === 1
                            ? "bg-red-100 text-red-800"
                            : order.priority === 2
                              ? "bg-orange-100 text-orange-800"
                              : order.priority === 3
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        P{order.priority}
                      </span>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                {assignedOrders.length > 5 && (
                  <div className="text-center pt-2">
                    <Link to="/orders">
                      <Button variant="ghost" size="sm">
                        View all {assignedOrders.length} orders →
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Streamline your workflow with these actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/orders" className="block">
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <div className="text-left">
                  <Package className="h-5 w-5 mb-2" />
                  <div className="font-medium">View All Orders</div>
                  <div className="text-xs text-gray-500">
                    Browse and manage orders
                  </div>
                </div>
              </Button>
            </Link>

            <Link to="/projects" className="block">
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <div className="text-left">
                  <Users className="h-5 w-5 mb-2" />
                  <div className="font-medium">Browse Projects</div>
                  <div className="text-xs text-gray-500">
                    Access project details
                  </div>
                </div>
              </Button>
            </Link>

            <Link to="/batches" className="block">
              <Button
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <div className="text-left">
                  <Database className="h-5 w-5 mb-2" />
                  <div className="font-medium">Manage Batches</div>
                  <div className="text-xs text-gray-500">
                    Process batch data
                  </div>
                </div>
              </Button>
            </Link>

            <Button
              className="w-full justify-start h-auto p-4"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <div className="text-left">
                <CheckCircle className="h-5 w-5 mb-2" />
                <div className="font-medium">Refresh</div>
                <div className="text-xs text-gray-500">
                  Update dashboard data
                </div>
              </div>
            </Button>
          </div>

          {assignedOrders.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Your productivity insights:
                </span>
                <span className="font-medium">
                  Completion Rate:{" "}
                  {stats.completedOrders > 0
                    ? Math.round(
                        (stats.completedOrders / stats.totalAssigned) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-600 font-medium">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Azure Services</span>
                <span className="text-sm text-green-600 font-medium">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">PDF Processing</span>
                <span className="text-sm text-green-600 font-medium">
                  Operational
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">No critical alerts</div>
              <div className="text-sm text-orange-600">
                2 batches require validation
              </div>
              <div className="text-sm text-blue-600">
                Schema update available
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
