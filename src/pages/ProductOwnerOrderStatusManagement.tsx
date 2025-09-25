import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RefreshCw, Save, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "../config/api";
import type { OrderStatus } from "../types";

const ProductOwnerOrderStatusManagement: React.FC = () => {
  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest("/api/order-statuses", {
        method: "GET",
      });
      const data = await response.json();
      setStatuses(data.statuses || []);
    } catch (err) {
      setError("Failed to load order statuses");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await apiRequest("/api/order-statuses", {
        method: "POST",
        body: JSON.stringify({ statuses }),
        headers: { "Content-Type": "application/json" },
      });
      setSuccess("Order statuses saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to save order statuses");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Order Status Management</CardTitle>
          <CardDescription>
            Manage the list of available order statuses for all tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading order statuses...
            </div>
          ) : (
            <ul className="space-y-2">
              {statuses.map((status, idx) => (
                <li key={status} className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-900">{status}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={loadStatuses}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductOwnerOrderStatusManagement;
