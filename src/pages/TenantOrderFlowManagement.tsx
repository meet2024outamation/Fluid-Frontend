import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  GripVertical,
  Save,
  RotateCcw,
  Eye,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { orderFlowService } from "../services/orderFlowService";
import { apiRequest } from "../config/api";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import type { OrderFlowStep } from "../types";

interface TenantOrderFlowManagementProps {}

const TenantOrderFlowManagement: React.FC<
  TenantOrderFlowManagementProps
> = () => {
  const { getSelectedTenant, selectedTenantIdentifier } = useTenantSelection();
  const [selectedTenant, setSelectedTenant] = useState(getSelectedTenant());
  const [steps, setSteps] = useState<OrderFlowStep[]>([]);
  const [originalSteps, setOriginalSteps] = useState<OrderFlowStep[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const tenant = getSelectedTenant();
    setSelectedTenant(tenant);
    if (tenant?.tenantId) {
      loadOrderStatuses();
    }
    // Don't call loadOrderFlow here!
  }, [selectedTenantIdentifier]);

  // When availableStatuses is loaded, then load order flow
  useEffect(() => {
    if (selectedTenant?.tenantId && availableStatuses.length > 0) {
      loadOrderFlow(selectedTenant.tenantId);
    }
  }, [availableStatuses, selectedTenant?.tenantId]);

  // Fetch available order statuses from API
  const loadOrderStatuses = async () => {
    try {
      const response = await apiRequest("/api/order-statuses", {
        method: "GET",
      });
      const data = await response.json();
      // If API returns an array of objects, map to array of names
      if (Array.isArray(data)) {
        setAvailableStatuses(data.map((statusObj: any) => statusObj.name));
      } else if (Array.isArray(data.statuses)) {
        setAvailableStatuses(
          data.statuses.map((statusObj: any) => statusObj.name || statusObj)
        );
      } else {
        setAvailableStatuses([]);
      }
    } catch (err) {
      setAvailableStatuses([]);
    }
  };

  useEffect(() => {
    // Check if there are unsaved changes
    const hasChangedSteps =
      JSON.stringify(steps) !== JSON.stringify(originalSteps);
    setHasChanges(hasChangedSteps);
  }, [steps, originalSteps]);

  const loadOrderFlow = async (tenantId?: string) => {
    const idToUse = tenantId || selectedTenant?.tenantId;
    if (!idToUse) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Try to get existing tenant order flow
      const orderFlow = await orderFlowService.getTenantOrderFlow(idToUse);
      if (
        orderFlow &&
        Array.isArray(orderFlow.steps) &&
        orderFlow.steps.length > 0
      ) {
        setSteps(orderFlow.steps);
        setOriginalSteps(orderFlow.steps);
      } else {
        throw new Error("No steps found");
      }
    } catch (error) {
      // If no existing flow, use availableStatuses to build default steps
      const defaultSteps = availableStatuses.map((status, index) => ({
        id: `step-${status.toLowerCase()}`,
        status: status as any, // Cast to OrderStatus
        rank: index + 1,
        isActive: true,
        label: status,
        description: "",
      }));
      setSteps(defaultSteps);
      setOriginalSteps(defaultSteps);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedSteps = orderFlowService.reorderSteps(
      steps,
      result.source.index,
      result.destination.index
    );

    setSteps(reorderedSteps);
  };

  const toggleStepActive = (stepId: string) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId ? { ...step, isActive: !step.isActive } : step
      )
    );
  };

  const handleSave = async () => {
    if (!selectedTenant?.tenantId) return;

    try {
      setSaving(true);
      setError(null);

      // Validate the flow
      const validation = orderFlowService.validateOrderFlow(steps);
      if (!validation.isValid) {
        setError(`Validation failed: ${validation.errors.join(", ")}`);
        return;
      }

      // Call new API for each step
      for (const step of steps) {
        await orderFlowService.createOrderFlow({
          orderId: Number(selectedTenant.tenantId),
          orderStatusId:
            typeof step.status === "number" ? step.status : step.rank, // Use status if number, else fallback
          rank: step.rank,
          isActive: step.isActive,
        });
      }
      setOriginalSteps([...steps]);
      setSuccessMessage("Order flow saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save order flow:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save order flow"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTenant?.tenantId) return;

    try {
      setIsResetting(true);
      setError(null);

      // TODO: Implement when API endpoints are ready
      console.log("Reset functionality - API endpoints not yet implemented");

      // Use default steps for now
      const defaultSteps = orderFlowService.getDefaultFlowSteps();
      setSteps(defaultSteps);
      setOriginalSteps(defaultSteps);
      setSuccessMessage("Order flow reset to default (demo mode)!");
      setTimeout(() => setSuccessMessage(null), 3000);

      /* TODO: Uncomment when API is ready
      const defaultFlow = await orderFlowService.resetToDefaultFlow(
        selectedTenant.tenantId
      );
      setSteps(defaultFlow.steps);
      setOriginalSteps(defaultFlow.steps);
      setSuccessMessage("Order flow reset to default successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      */
    } catch (error) {
      console.error("Failed to reset order flow:", error);
      setError(
        error instanceof Error ? error.message : "Failed to reset order flow"
      );
    } finally {
      setIsResetting(false);
    }
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return "bg-gray-100 text-gray-500";

    const colors: Record<string, string> = {
      Created: "bg-blue-100 text-blue-800",
      ValidationError: "bg-red-100 text-red-800",
      ReadyForAI: "bg-purple-100 text-purple-800",
      AIProcessing: "bg-indigo-100 text-indigo-800",
      ReadyForAssignment: "bg-orange-100 text-orange-800",
      Assigned: "bg-yellow-100 text-yellow-800",
      InProgress: "bg-green-100 text-green-800",
      QCRequired: "bg-pink-100 text-pink-800",
      Completed: "bg-emerald-100 text-emerald-800",
      Error: "bg-red-100 text-red-800",
    };

    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (!selectedTenant) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Tenant Selected
            </h3>
            <p className="text-gray-600">
              Please select a tenant to manage order flow.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Order Flow Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure the order processing workflow for{" "}
              {selectedTenant.tenantName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isResetting || isLoading}
            >
              {isResetting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset to Default
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isLoading}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">Success</h4>
              <p className="text-sm text-green-600 mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Flow Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Flow Steps</CardTitle>
          <CardDescription>
            Drag and drop to reorder steps. Toggle switches to enable/disable
            steps.
            {hasChanges && (
              <span className="ml-2 text-orange-600 font-medium">
                (Unsaved changes)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading order flow...
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="order-flow-steps">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 ${
                      snapshot.isDraggingOver ? "bg-blue-50" : ""
                    } p-2 rounded-lg transition-colors`}
                  >
                    {steps.map((step, index) => (
                      <Draggable
                        key={step.id}
                        draggableId={step.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border rounded-lg p-4 ${
                              snapshot.isDragging
                                ? "shadow-lg bg-white border-blue-300"
                                : "bg-white border-gray-200"
                            } transition-all`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>

                              {/* Rank */}
                              <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                                {step.rank}
                              </div>

                              {/* Status Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-semibold text-lg">
                                    {step.label}
                                  </h3>
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                      step.status,
                                      step.isActive
                                    )}`}
                                  >
                                    {step.status}
                                  </span>
                                </div>
                                {step.description && (
                                  <p className="text-gray-600 text-sm">
                                    {step.description}
                                  </p>
                                )}
                              </div>

                              {/* Toggle Switch */}
                              <div className="flex items-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={step.isActive}
                                    onChange={() => toggleStepActive(step.id)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <span className="ml-3 text-sm text-gray-600">
                                  {step.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Flow Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Order Flow Preview</CardTitle>
            <CardDescription>
              Visual representation of how orders will progress through the
              configured steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-4">
              {steps
                .filter((step) => step.isActive)
                .map((step, index, activeSteps) => (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center min-w-0 flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold mb-2">
                        {step.rank}
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm mb-1">
                          {step.label}
                        </div>
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            step.status,
                            step.isActive
                          )}`}
                        >
                          {step.status}
                        </div>
                      </div>
                    </div>
                    {index < activeSteps.length - 1 && (
                      <div className="flex-shrink-0 w-8 h-0.5 bg-gray-300 mt-6"></div>
                    )}
                  </React.Fragment>
                ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Active Steps:</strong>{" "}
                {steps.filter((s) => s.isActive).length} of {steps.length}
              </p>
              <p>
                <strong>Flow Path:</strong>{" "}
                {steps
                  .filter((s) => s.isActive)
                  .map((s) => s.label)
                  .join(" → ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantOrderFlowManagement;
