import React, { useState, useEffect } from "react";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  FileText,
  Users,
  Calendar,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { batchService, type BatchListResponse } from "../services/batchService";
import { useTenantSelection } from "../contexts/TenantSelectionContext";

const BatchManagement: React.FC = () => {
  const { isTenantAdmin, needsTenantSelection, needsProjectSelection } =
    useTenantSelection();

  // Redirect tenant admin users to tenant selection if they haven't selected a tenant
  if (isTenantAdmin && needsTenantSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // Redirect if project selection is needed
  if (needsProjectSelection) {
    return <Navigate to="/project-selection" replace />;
  }
  const [batches, setBatches] = useState<BatchListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const batchesData = await batchService.getAllBatches();
      setBatches(batchesData);
    } catch (error) {
      console.error("Failed to load batches:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load batches from backend"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "error":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgressPercentage = (processed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((processed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading batches...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={loadBatches} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Batch Management
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor batch processing operations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadBatches} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link to="/batches/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* Batches List */}
      {batches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No batches have been created yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first batch to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <Card key={batch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="truncate">{batch.name}</span>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      batch.status
                    )}`}
                  >
                    {batch.status}
                  </span>
                </CardTitle>
                <CardDescription className="truncate">
                  Project: {batch.projectName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Progress Statistics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-semibold text-gray-900">
                        {batch.totalOrders}
                      </p>
                      <p className="text-gray-600">Total</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="font-semibold text-blue-900">
                        {batch.processedOrders}
                      </p>
                      <p className="text-blue-600">Processed</p>
                    </div>
                  </div>

                  {/* Valid/Invalid Orders */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="font-semibold text-green-900">
                        {batch.validOrders}
                      </p>
                      <p className="text-green-600">Valid</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="font-semibold text-red-900">
                        {batch.invalidOrders}
                      </p>
                      <p className="text-red-600">Invalid</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {getProgressPercentage(
                          batch.processedOrders,
                          batch.totalOrders
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${getProgressPercentage(batch.processedOrders, batch.totalOrders)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-3 border-t space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        Metadata: {batch.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        {formatDate(batch.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">
                        Created by {batch.createdByName}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchManagement;
