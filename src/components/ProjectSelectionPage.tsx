import React from "react";
import { Navigate } from "react-router-dom";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

export const ProjectSelectionPage: React.FC = () => {
  const {
    isLoading,
    isProductOwner,
    isTenantAdmin,
    needsProjectSelection,
    selectedTenantIdentifier,
    getSelectedTenant,
    selectProject,
    clearSelection,
  } = useTenantSelection();

  // If user is Product Owner, redirect to dashboard
  if (isProductOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is Tenant Admin and has selected a tenant, go to tenant dashboard
  if (isTenantAdmin && selectedTenantIdentifier && !needsProjectSelection) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user doesn't need project selection, redirect appropriately
  if (!needsProjectSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedTenant = getSelectedTenant();

  if (!selectedTenant) {
    return <Navigate to="/tenant-selection" replace />;
  }

  const handleProjectSelect = (projectId: number) => {
    selectProject(projectId);
    // After project selection, redirect to operator dashboard
  };

  const handleBackToTenants = () => {
    clearSelection();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Project
          </h1>
          <p className="text-gray-600 mb-4">
            Choose a project from{" "}
            <span className="font-medium">{selectedTenant.tenantName}</span>
          </p>
          <Button
            variant="outline"
            onClick={handleBackToTenants}
            className="mb-4"
          >
            ← Back to Tenant Selection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedTenant.projects.map((project) => (
            <Card
              key={project.projectId}
              className={`cursor-pointer hover:shadow-lg transition-shadow duration-200 ${
                !project.isActive ? "opacity-60" : ""
              }`}
              onClick={() =>
                project.isActive && handleProjectSelect(project.projectId)
              }
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {project.projectName}
                  {!project.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {project.projectCode && (
                    <span className="font-mono text-sm">
                      {project.projectCode}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.description && (
                  <p className="text-sm text-gray-600">{project.description}</p>
                )}

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Created: </span>
                    <span className="text-gray-600">
                      {project.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Your Roles: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.userRoles.map((role, index) => (
                        <span
                          key={index}
                          className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4" disabled={!project.isActive}>
                  {project.isActive ? "Select Project" : "Project Inactive"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedTenant.projects.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-600">No projects found in this tenant.</p>
          </div>
        )}
      </div>
    </div>
  );
};
