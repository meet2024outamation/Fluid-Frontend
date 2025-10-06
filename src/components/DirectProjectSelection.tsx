import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import type { AccessibleProject, AccessibleTenant } from "../types";

interface ProjectWithTenant extends AccessibleProject {
  tenantInfo: {
    tenantId: string;
    tenantName: string;
    tenantIdentifier: string;
    description?: string;
  };
}

export const DirectProjectSelection: React.FC = () => {
  // ALL HOOKS MUST BE CALLED FIRST
  const {
    isAuthenticated,
    accessibleTenants,
    isLoading: authLoading,
  } = useAuth();
  const {
    isLoading: tenantLoading,
    isProductOwner,
    isTenantAdmin,
    hasProjectAccess,
    selectTenantAndProject,
    getAllAccessibleTenants,
  } = useTenantSelection();

  const navigate = useNavigate();

  // NOW we can do conditional returns after all hooks have been called
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
            Loading your projects...
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch your accessible projects.
          </p>
        </div>
      </div>
    );
  }

  // Redirect Product Owners and Tenant Admins to their respective flows
  if (isProductOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isTenantAdmin) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // No access - show appropriate message
  if (!accessibleTenants || !hasProjectAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <h1 className="text-xl font-bold mb-2">No Project Access</h1>
            <p className="text-sm">
              You don't currently have access to any projects in this system.
              Please contact your administrator to request access.
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

  // Flatten all projects with their tenant information
  const allProjects: ProjectWithTenant[] = [];

  const allTenants = getAllAccessibleTenants();

  allTenants.forEach((tenant: AccessibleTenant) => {
    tenant.projects.forEach((project: AccessibleProject) => {
      allProjects.push({
        ...project,
        tenantInfo: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          tenantIdentifier: tenant.tenantIdentifier,
          description: tenant.description,
        },
      });
    });
  });

  const handleProjectSelect = async (project: ProjectWithTenant) => {
    try {
      await selectTenantAndProject(
        project.tenantInfo.tenantIdentifier,
        project.projectId
      );
      // Navigation will be handled by the context after successful selection
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to select project:", error);
      // Could add user notification here
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Your Project
          </h1>
          <p className="text-gray-600">
            Choose a project to start working. Your selection will set both
            tenant and project context.
          </p>
        </div>

        {allProjects.length === 0 ? (
          <div className="text-center mt-12">
            <div className="bg-gray-100 rounded-lg p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Projects Available
              </h3>
              <p className="text-gray-600">
                No active projects found in your accessible tenants.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allProjects.map((project) => (
              <Card
                key={`${project.tenantInfo.tenantId}-${project.projectId}`}
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 ${
                  !project.isActive ? "opacity-60" : ""
                }`}
                onClick={() => project.isActive && handleProjectSelect(project)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {project.projectName}
                    {!project.isActive && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </CardTitle>
                  {project.projectCode && (
                    <CardDescription className="font-mono text-sm">
                      {project.projectCode}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Tenant Information */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm">
                      <span className="font-medium text-blue-800">
                        Tenant:{" "}
                      </span>
                      <span className="text-blue-700">
                        {project.tenantInfo.tenantName}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {project.tenantInfo.tenantIdentifier}
                    </div>
                    {project.tenantInfo.description && (
                      <div className="text-xs text-blue-600 mt-1">
                        {project.tenantInfo.description}
                      </div>
                    )}
                  </div>

                  {/* Project Details */}
                  {project.description && (
                    <div className="text-sm text-gray-600">
                      {project.description}
                    </div>
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
                            className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Created: </span>
                      <span className="text-gray-600">
                        {typeof project.createdAt === "string"
                          ? formatDate(project.createdAt)
                          : formatDate(project.createdAt.toISOString())}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4"
                    size="sm"
                    disabled={!project.isActive}
                  >
                    {project.isActive ? "Select Project" : "Project Inactive"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Information */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg p-4 inline-block shadow-sm border">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{allProjects.length}</span> total
              projects from{" "}
              <span className="font-medium">{allTenants.length}</span> tenants
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
