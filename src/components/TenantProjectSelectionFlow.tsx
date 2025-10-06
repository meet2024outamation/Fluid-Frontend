import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import { DirectProjectSelection } from "./DirectProjectSelection";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

interface TenantProjectSelectionFlowProps {
  onSelectionComplete?: () => void;
}

export const TenantProjectSelectionFlow: React.FC<
  TenantProjectSelectionFlowProps
> = ({ onSelectionComplete }) => {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const {
    isAuthenticated,
    accessibleTenants,
    fetchMeData,
    isLoading: authLoading,
  } = useAuth();

  const {
    selectedTenantIdentifier,
    selectedProjectId,
    isLoading: tenantLoading,
    isProductOwner,
    isTenantAdmin,
    hasProjectAccess,
    selectTenant,
    selectProject,
    getSelectedTenant,
    getAllAccessibleTenants,
  } = useTenantSelection();

  const [currentStep, setCurrentStep] = useState<
    "tenant" | "project" | "complete"
  >("tenant");
  const [isCallMeApi, setIsCallMeApi] = useState(false);
  const navigate = useNavigate();

  // Determine current step based on selection state
  useEffect(() => {
    if (!selectedTenantIdentifier) {
      setCurrentStep("tenant");
    } else if (!isTenantAdmin && hasProjectAccess && !selectedProjectId) {
      setCurrentStep("project");
    } else {
      setCurrentStep("complete");
    }
  }, [
    selectedTenantIdentifier,
    selectedProjectId,
    isTenantAdmin,
    hasProjectAccess,
  ]);

  // Handle ME API call and completion
  useEffect(() => {
    const handleCompletion = async () => {
      if (currentStep === "complete" && !isCallMeApi) {
        setIsCallMeApi(true);

        try {
          // Call ME API with appropriate headers based on selection
          await fetchMeData();

          // Navigate to dashboard or call completion callback
          if (onSelectionComplete) {
            onSelectionComplete();
          } else {
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Failed to fetch user permissions:", error);

          // Requirement: If me call fails, show an error message and keep the user on the selection screen
          console.error(
            "Failed to load your permissions. Please try selecting your tenant/project again."
          );

          // Reset to appropriate selection step
          if (!isTenantAdmin && hasProjectAccess && selectedProjectId) {
            // Go back to project selection
            setCurrentStep("project");
          } else if (selectedTenantIdentifier) {
            // Go back to tenant selection
            setCurrentStep("tenant");
          }

          setIsCallMeApi(false);
        }
      }
    };

    handleCompletion();
  }, [
    currentStep,
    isCallMeApi,
    fetchMeData,
    navigate,
    onSelectionComplete,
    isTenantAdmin,
    hasProjectAccess,
    selectedProjectId,
    selectedTenantIdentifier,
  ]);

  // NOW we can do conditional returns after all hooks have been called
  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Loading states
  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading your access information...
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch your tenants and projects.
          </p>
        </div>
      </div>
    );
  }

  // No access - show appropriate message
  if (
    !accessibleTenants ||
    (!isProductOwner &&
      (!accessibleTenants.tenantAdminIds ||
        accessibleTenants.tenantAdminIds.length === 0) &&
      (!accessibleTenants.tenants || accessibleTenants.tenants.length === 0))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <h1 className="text-xl font-bold mb-2">No Access Available</h1>
            <p className="text-sm">
              You don't currently have access to any tenants or projects in this
              system. Please contact your administrator to request access.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className="mt-4"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Product Owner - skip selection and redirect directly
  if (isProductOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  // Regular users (not tenant admin, not product owner) - use direct project selection
  if (!isProductOwner && !isTenantAdmin && hasProjectAccess) {
    return <DirectProjectSelection />;
  }

  const handleTenantSelect = async (tenantIdentifier: string) => {
    try {
      await selectTenant(tenantIdentifier);
      // State will update and useEffect will handle step transition
    } catch (error) {
      console.error("Failed to select tenant:", error);
      console.error("Failed to select tenant. Please try again.");
    }
  };

  const handleProjectSelect = async (projectId: number) => {
    try {
      await selectProject(projectId);
      // State will update and useEffect will handle step transition
    } catch (error) {
      console.error("Failed to select project:", error);
      console.error("Failed to select project. Please try again.");
    }
  };

  // Get all accessible tenants for display
  const allTenants = getAllAccessibleTenants();
  const selectedTenant = getSelectedTenant();

  // Render tenant selection step
  if (currentStep === "tenant") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Select Your Tenant
            </h1>
            <p className="text-gray-600">
              Choose a tenant to continue. Your access level will determine
              available features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTenants.map((tenant) => (
              <Card
                key={tenant.tenantId}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300"
                onClick={() => handleTenantSelect(tenant.tenantIdentifier)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{tenant.tenantName}</CardTitle>
                  <CardDescription>{tenant.tenantIdentifier}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tenant.description && (
                    <p className="text-sm text-gray-600">
                      {tenant.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Projects: </span>
                      <span className="text-gray-600">
                        {tenant.projectCount}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Your Access: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tenant.userRoles.map((role, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded text-xs ${
                              role === "Tenant Admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button className="w-full mt-4" size="sm">
                    Select Tenant
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {allTenants.length === 0 && (
            <div className="text-center mt-8">
              <p className="text-gray-600">No accessible tenants found.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render project selection step (for non-tenant admins)
  if (currentStep === "project" && selectedTenant && !isTenantAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Select Your Project
            </h1>
            <p className="text-gray-600 mb-2">
              Choose a project within{" "}
              <strong>{selectedTenant.tenantName}</strong>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentStep("tenant");
                // Clear selection to go back to tenant selection
                // Note: This would need to be handled by the context
              }}
            >
              ← Change Tenant
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedTenant.projects.map((project) => (
              <Card
                key={project.projectId}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-300"
                onClick={() => handleProjectSelect(project.projectId)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {project.projectName}
                  </CardTitle>
                  {project.projectCode && (
                    <CardDescription>{project.projectCode}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-gray-600">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Status: </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          project.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {project.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Your Roles: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.userRoles.map((role, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Created: </span>
                      <span className="text-gray-600">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full mt-4" size="sm">
                    Select Project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTenant.projects.length === 0 && (
            <div className="text-center mt-8">
              <p className="text-gray-600">
                No accessible projects found in this tenant.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render loading/completion step
  if (currentStep === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Setting up your workspace...
          </h2>
          <p className="text-gray-600">
            Loading your permissions and dashboard.
          </p>
        </div>
      </div>
    );
  }

  return null;
};
