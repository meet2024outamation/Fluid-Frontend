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

export const TenantSelectionPage: React.FC = () => {
  const {
    accessibleTenants,
    isLoading,
    isProductOwner,
    isTenantAdmin,
    selectTenant,
    needsTenantSelection,
  } = useTenantSelection();

  // If user is Product Owner, redirect to dashboard
  if (isProductOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user doesn't need tenant selection, redirect appropriately
  if (!needsTenantSelection) {
    return <Navigate to="/project-selection" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading tenant information...
          </h2>
          <p className="text-gray-600">
            Please wait while we fetch your accessible tenants.
          </p>
        </div>
      </div>
    );
  }

  if (!accessibleTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            No Accessible Tenants
          </h1>
          <p className="text-gray-600">
            You don't have access to any tenants or projects.
          </p>
        </div>
      </div>
    );
  }

  const handleTenantSelect = (tenantId: string) => {
    selectTenant(tenantId);
    // Navigation will be handled by the router based on needsProjectSelection
  };

  // Show tenant selection for Tenant Admins
  const tenantAdminTenants = isTenantAdmin
    ? accessibleTenants.tenants.filter((t) =>
        accessibleTenants.tenantAdminTenantIds.includes(t.tenantId)
      )
    : accessibleTenants.tenants;

  // Show loading if tenant admin has no tenant details yet
  if (
    isTenantAdmin &&
    (!accessibleTenants.tenants || accessibleTenants.tenants.length === 0)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Loading tenant details...
          </h2>
          <p className="text-gray-600">
            Fetching information for your accessible tenants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Select Tenant
          </h1>
          <p className="text-gray-600">Choose a tenant to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenantAdminTenants.map((tenant) => (
            <Card
              key={tenant.tenantId}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleTenantSelect(tenant.tenantId)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{tenant.tenantName}</CardTitle>
                <CardDescription>{tenant.tenantIdentifier}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant.description && (
                  <p className="text-sm text-gray-600">{tenant.description}</p>
                )}

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Projects: </span>
                    <span className="text-gray-600">{tenant.projectCount}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Your Roles: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tenant.userRoles.map((role, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4">Select Tenant</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {tenantAdminTenants.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-600">No accessible tenants found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
