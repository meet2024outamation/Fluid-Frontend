import React, { useState, useEffect } from "react";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  FileText,
  Eye,
  Download,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { batchService, type BatchListResponse } from "../services/batchService";
import { useTenantSelection } from "../contexts/TenantSelectionContext";

const BatchManagement: React.FC = () => {
  const { isTenantAdmin, needsTenantSelection, needsProjectSelection } =
    useTenantSelection();

  if (isTenantAdmin && needsTenantSelection)
    return <Navigate to="/tenant-selection" replace />;
  if (needsProjectSelection)
    return <Navigate to="/project-selection" replace />;

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

  const getStatusBadge = (status: string) => {
    const base =
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium gap-1";
    switch (status.toLowerCase()) {
      case "completed":
        return `${base} bg-green-100 text-green-800`;
      case "processing":
        return `${base} bg-blue-100 text-blue-800`;
      case "pending":
        return `${base} bg-yellow-100 text-yellow-800`;
      case "error":
      case "failed":
        return `${base} bg-red-100 text-red-800`;
      default:
        return `${base} bg-gray-100 text-gray-800`;
    }
  };

  const getProgressPercentage = (processed: number, total: number) =>
    total === 0 ? 0 : Math.round((processed / total) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-3 text-lg font-medium">Loading batches...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <Button onClick={loadBatches} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Batch Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor batch processing operations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadBatches}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Link to="/batches/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create New Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md border overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {[
                "Name",
                "File Name",
                "Project",
                "Status",
                "Orders",
                "Progress",
                "Created",
                "Created By",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-gray-500">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <div className="text-lg font-medium">No batches yet</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Create your first batch to get started.
                  </p>
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr
                  key={batch.id}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-gray-900 truncate">
                    {batch.name}
                  </td>
                  <td className="px-5 py-4 text-gray-700 truncate">
                    {batch.fileName}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {batch.projectName}
                  </td>
                  <td className="px-5 py-4">
                    <span className={getStatusBadge(batch.status)}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    <div className="grid grid-cols-2 gap-x-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-900">
                          {batch.totalOrders}
                        </span>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div>
                        <span className="font-semibold text-blue-900">
                          {batch.processedOrders}
                        </span>
                        <div className="text-xs text-blue-600">Processed</div>
                      </div>
                      <div>
                        <span className="font-semibold text-green-900">
                          {batch.validOrders}
                        </span>
                        <div className="text-xs text-green-600">Valid</div>
                      </div>
                      <div>
                        <span className="font-semibold text-red-900">
                          {batch.invalidOrders}
                        </span>
                        <div className="text-xs text-red-600">Invalid</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 w-56">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Progress</span>
                        <span>
                          {getProgressPercentage(
                            batch.processedOrders,
                            batch.totalOrders
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${getProgressPercentage(batch.processedOrders, batch.totalOrders)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                    {new Date(batch.createdAt).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {batch.createdByName}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BatchManagement;
