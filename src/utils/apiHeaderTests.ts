/**
 * Test file to verify the API header management system
 * This file demonstrates the automatic header injection based on user roles
 */

import {
  apiRequest,
  apiAutoRequest,
  apiAutoJsonRequest,
  getUserRoleFromAccessibleTenants,
  getAuthHeaders,
} from "../config/api";

// Example: Testing automatic header injection
export const testApiHeaders = () => {
  console.log("=== API Header Management Test ===");

  // Test role detection
  const userRole = getUserRoleFromAccessibleTenants();
  console.log("Detected User Role:", userRole);

  // Test automatic headers
  const autoHeaders = getAuthHeaders({ useAutoHeaders: true });
  console.log("Automatic Headers:", autoHeaders);

  // Test manual headers (legacy)
  const manualHeaders = getAuthHeaders({
    useAutoHeaders: false,
    includeTenant: true,
    includeProject: true,
  });
  console.log("Manual Headers:", manualHeaders);

  return {
    userRole,
    autoHeaders,
    manualHeaders,
  };
};

// Example: Different API request patterns
export const exampleApiUsage = async () => {
  try {
    // 1. Automatic headers (recommended for new code)
    console.log("Testing automatic API requests...");

    // Simple automatic request
    const ordersResponse = await apiAutoRequest("/api/orders");
    console.log("Orders Response Status:", ordersResponse.status);

    // Automatic JSON request
    const ordersData = await apiAutoJsonRequest("/api/orders");
    console.log("Orders Data:", ordersData);

    // 2. Manual header control (for special cases)
    console.log("Testing manual header control...");

    // Force Product Owner mode (no headers)
    const globalResponse = await apiRequest("/api/orders", {
      useAutoHeaders: false,
      includeTenant: false,
      includeProject: false,
    });
    console.log("Global Response Status:", globalResponse.status);

    // Force specific context
    const specificResponse = await apiRequest("/api/orders", {
      useAutoHeaders: false,
      includeTenant: true,
      includeProject: true,
      overrideTenantIdentifier: "test-tenant",
      overrideProjectId: 999,
    });
    console.log("Specific Context Response Status:", specificResponse.status);
  } catch (error) {
    console.error("API Test Error:", error);
  }
};

// Example: Role-based behavior demonstration
export const demonstrateRoleBasedHeaders = () => {
  console.log("=== Role-Based Header Demonstration ===");

  // Simulate different user roles by modifying localStorage
  const originalData = localStorage.getItem("accessibleTenants");

  // Test Product Owner
  localStorage.setItem(
    "accessibleTenants",
    JSON.stringify({
      isProductOwner: true,
      tenantAdminIds: [],
      tenants: [],
    })
  );
  console.log(
    "Product Owner Headers:",
    getAuthHeaders({ useAutoHeaders: true })
  );

  // Test Tenant Admin
  localStorage.setItem(
    "accessibleTenants",
    JSON.stringify({
      isProductOwner: false,
      tenantAdminIds: [{ tenantId: "tenant-1", tenantName: "Test Tenant" }],
      tenants: [],
    })
  );
  console.log(
    "Tenant Admin Headers:",
    getAuthHeaders({ useAutoHeaders: true })
  );

  // Test Regular User
  localStorage.setItem(
    "accessibleTenants",
    JSON.stringify({
      isProductOwner: false,
      tenantAdminIds: [],
      tenants: [{ tenantId: "tenant-1", projects: [{ projectId: 123 }] }],
    })
  );
  localStorage.setItem("selectedTenantIdentifier", "test-tenant");
  localStorage.setItem("selectedProjectId", "123");
  console.log(
    "Regular User Headers:",
    getAuthHeaders({ useAutoHeaders: true })
  );

  // Restore original data
  if (originalData) {
    localStorage.setItem("accessibleTenants", originalData);
  } else {
    localStorage.removeItem("accessibleTenants");
  }
};

// Run all tests (uncomment in development to test)
/*
console.log('Running API Header Tests...');
testApiHeaders();
demonstrateRoleBasedHeaders();
exampleApiUsage();
*/
