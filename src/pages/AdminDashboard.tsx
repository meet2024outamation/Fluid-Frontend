import React from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Package,
  FileText,
  CheckCircle,
  Database,
  Upload,
  Plus,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";

export const AdminDashboard: React.FC = () => {
  // Mock data - in real app, this would come from API
  const stats = {
    totalClients: 24,
    activeBatches: 12,
    pendingOrders: 156,
    completedOrders: 2389,
    dailyProductivity: [
      { date: "2024-01-15", ordersProcessed: 45, averageTime: 12.5 },
      { date: "2024-01-16", ordersProcessed: 52, averageTime: 11.8 },
      { date: "2024-01-17", ordersProcessed: 38, averageTime: 13.2 },
    ],
  };

  const recentActivity = [
    {
      id: 1,
      action: 'New client "ABC Corp" created',
      time: "2 minutes ago",
      type: "client",
    },
    {
      id: 2,
      action: "Batch B-2024-001 completed",
      time: "15 minutes ago",
      type: "batch",
    },
    {
      id: 3,
      action: 'Schema "Invoice V2" updated',
      time: "1 hour ago",
      type: "schema",
    },
    {
      id: 4,
      action: "23 orders processed by John Doe",
      time: "2 hours ago",
      type: "order",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Overview of system performance and quick actions
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/clients">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Client
            </Button>
          </Link>
          <Link to="/schemas">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Schema
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Batches
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBatches}</div>
            <p className="text-xs text-muted-foreground">
              3 processing, 9 ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">-12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Orders
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">+18% from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Link to="/clients">
                <Button variant="outline" className="h-20 flex-col w-full">
                  <Users className="h-6 w-6 mb-2" />
                  <span>Manage Clients</span>
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {activity.type === "client" && (
                      <Users className="h-4 w-4 text-blue-500" />
                    )}
                    {activity.type === "batch" && (
                      <Package className="h-4 w-4 text-green-500" />
                    )}
                    {activity.type === "schema" && (
                      <Database className="h-4 w-4 text-purple-500" />
                    )}
                    {activity.type === "order" && (
                      <FileText className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Daily productivity overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">145</div>
              <p className="text-sm text-gray-600">Orders Today</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">11.2 min</div>
              <p className="text-sm text-gray-600">Avg. Processing Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">98.5%</div>
              <p className="text-sm text-gray-600">Accuracy Rate</p>
            </div>
          </div>
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
