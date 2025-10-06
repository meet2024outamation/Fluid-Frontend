import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { TenantSelectionProvider } from "./contexts/TenantSelectionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DefaultRedirect } from "./components/DefaultRedirect";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/LoginPage";

import { ProjectSelectionPage } from "./components/ProjectSelectionPage";
import { TenantProjectSelectionFlow } from "./components/TenantProjectSelectionFlow";
import { NoAccessPage } from "./components/NoAccessPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import FieldMapping from "./pages/FieldMapping";
import CreateFieldMapping from "./pages/CreateFieldMapping";
import SchemaManagement from "./pages/SchemaManagement";
import SchemaForm from "./pages/SchemaForm";
import ProjectManagement from "./pages/ProjectManagement";
import ProjectForm from "./pages/ProjectForm";
import CreateBatch from "./pages/CreateBatch";
import BatchManagement from "./pages/BatchManagement";
import UserManagement from "./components/UserManagement";
import RolesManagement from "./pages/RolesManagement";
import TenantManagement from "./components/TenantManagement";
import GlobalSchemaManagement from "./components/GlobalSchemaManagement";
import TenantOrderFlowManagement from "./pages/TenantOrderFlowManagement";
import ProductOwnerOrderStatusManagement from "./pages/ProductOwnerOrderStatusManagement";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <TenantSelectionProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DefaultRedirect />
                </ProtectedRoute>
              }
            />

            {/* Tenant/Project Selection Routes */}
            <Route
              path="/tenant-selection"
              element={
                <ProtectedRoute>
                  <TenantProjectSelectionFlow />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-selection"
              element={
                <ProtectedRoute>
                  <ProjectSelectionPage />
                </ProtectedRoute>
              }
            />

            {/* No Access Route */}
            <Route
              path="/no-access"
              element={
                <ProtectedRoute>
                  <NoAccessPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes with MainLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard - Permission-based access */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute
                    permissions={[
                      "ViewReports",
                      "ViewProjects",
                      "AssignRoles",
                      "ViewUsers",
                    ]}
                    requireAll={false}
                  >
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Batch Management - Permission-based access */}
              <Route
                path="batches"
                element={
                  <ProtectedRoute
                    permissions={["ViewBatches"]}
                    requireAll={false}
                  >
                    <BatchManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="batches/create"
                element={
                  <ProtectedRoute
                    permissions={["CreateBatches", "CreateOrder"]}
                    requireAll={false}
                  >
                    <CreateBatch />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects"
                element={
                  <ProtectedRoute permission="ViewProjects">
                    <ProjectManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects/create"
                element={
                  <ProtectedRoute permission="CreateProjects">
                    <ProjectForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects/view/:id"
                element={
                  <ProtectedRoute
                    permissions={["ViewProjects", "ViewReports"]}
                    requireAll={false}
                  >
                    <ProjectForm isViewMode={true} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects/edit/:id"
                element={
                  <ProtectedRoute permission="UpdateProjects">
                    <ProjectForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="schemas"
                element={
                  <ProtectedRoute permission="ViewSchemas">
                    <SchemaManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="schemas/create"
                element={
                  <ProtectedRoute permission="CreateSchemas">
                    <SchemaForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="schemas/edit/:id"
                element={
                  <ProtectedRoute permission="UpdateSchemas">
                    <SchemaForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="field-mapping"
                element={
                  <ProtectedRoute permission="ViewSchemas">
                    <FieldMapping />
                  </ProtectedRoute>
                }
              />

              <Route
                path="field-mapping/create"
                element={
                  <ProtectedRoute permission="CreateSchemas">
                    <CreateFieldMapping />
                  </ProtectedRoute>
                }
              />

              <Route
                path="order-flow"
                element={
                  <ProtectedRoute permission="ViewOrderFlow">
                    <TenantOrderFlowManagement />
                  </ProtectedRoute>
                }
              />

              {/* Product Owner Only Routes */}
              <Route
                path="users"
                element={
                  <ProtectedRoute permission="CreateUsers">
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="roles"
                element={
                  <ProtectedRoute permission="CreateRoles">
                    <RolesManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="tenants"
                element={
                  <ProtectedRoute permission="CreateTenants">
                    <TenantManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="order-status-management"
                element={
                  <ProtectedRoute
                    permissions={["ViewOrderFlow", "ViewReports"]}
                    requireAll={false}
                  >
                    <ProductOwnerOrderStatusManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="global-schemas"
                element={
                  <ProtectedRoute permission="ViewGlobalSchemas">
                    <GlobalSchemaManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="global-schemas/create"
                element={
                  <ProtectedRoute permission="CreateGlobalSchemas">
                    <SchemaForm isGlobal={true} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="global-schemas/edit/:id"
                element={
                  <ProtectedRoute permission="UpdateGlobalSchemas">
                    <SchemaForm isGlobal={true} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="orders"
                element={
                  <ProtectedRoute
                    permissions={["ViewOrders", "ProcessOrders"]}
                    requireAll={false}
                  >
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="orders/:id"
                element={
                  <ProtectedRoute
                    permissions={["ViewOrders", "ProcessOrders"]}
                    requireAll={false}
                  >
                    <OrderDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* PDF Viewer Demo */}
              {/* <Route
                path="pdf-viewer"
                element={
                  <ProtectedRoute>
                    <PdfViewerDemo />
                  </ProtectedRoute>
                }
              /> */}

              {/* Debug Panel (Development only) */}
              {import.meta.env.DEV && (
                <Route
                  path="debug/auth"
                  element={
                    <ProtectedRoute>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">
                          Auth Debug Panel
                        </h1>
                        <p className="text-gray-600">
                          Debug panel coming soon...
                        </p>
                      </div>
                    </ProtectedRoute>
                  }
                />
              )}

              {/* Settings */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute
                    permissions={["ViewTenants", "ViewUsers", "ViewRoles"]}
                    requireAll={false}
                  >
                    <div className="p-8 text-center">
                      <h1 className="text-2xl font-bold mb-4">Settings</h1>
                      <p className="text-gray-600">Coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all redirect to login for unmatched routes */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </TenantSelectionProvider>
    </AuthProvider>
  );
}

export default App;
