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
import { TenantSelectionPage } from "./components/TenantSelectionPage";
import { ProjectSelectionPage } from "./components/ProjectSelectionPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import FieldMapping from "./pages/FieldMapping";
import CreateFieldMapping from "./pages/CreateFieldMapping";
import SchemaManagement from "./pages/SchemaManagement";
import SchemaForm from "./pages/SchemaForm";
import ProjectManagement from "./pages/ProjectManagement";
import ProjectForm from "./pages/ProjectForm";
import CreateBatch from "./pages/CreateBatch";
import BatchManagement from "./pages/BatchManagement";
import OperatorDashboard from "./pages/OperatorDashboard";
import UserManagement from "./components/UserManagement";
import TenantManagement from "./components/TenantManagement";
import GlobalSchemaManagement from "./components/GlobalSchemaManagement";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <TenantSelectionProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Tenant/Project Selection Routes */}
            <Route
              path="/tenant-selection"
              element={
                <ProtectedRoute>
                  <TenantSelectionPage />
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
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Default redirect for authenticated users */}
              <Route index element={<DefaultRedirect />} />

              {/* Product Owner & Tenant Admin Routes */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute
                    requiredRoles={["Product Owner", "Tenant Admin"]}
                  >
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Product Owner & Tenant Admin Routes */}
              <Route
                path="batches"
                element={
                  <ProtectedRoute
                    requiredRoles={["Product Owner", "Tenant Admin"]}
                  >
                    <BatchManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="batches/create"
                element={
                  <ProtectedRoute
                    requiredRoles={["Product Owner", "Tenant Admin"]}
                  >
                    <CreateBatch />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects"
                element={
                  <ProtectedRoute
                    requiredRoles={["Product Owner", "Tenant Admin"]}
                  >
                    <ProjectManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects/create"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <ProjectForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="projects/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <ProjectForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="schemas"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <SchemaManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="schemas/create"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <SchemaForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="schemas/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <SchemaForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="field-mapping"
                element={
                  <ProtectedRoute
                    requiredRoles={["Product Owner", "Tenant Admin"]}
                  >
                    <FieldMapping />
                  </ProtectedRoute>
                }
              />

              <Route
                path="field-mapping/create"
                element={
                  <ProtectedRoute
                    requiredRoles={["Product Owner", "Tenant Admin"]}
                  >
                    <CreateFieldMapping />
                  </ProtectedRoute>
                }
              />

              {/* Product Owner Only Routes */}
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="tenants"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <TenantManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="global-schemas"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <GlobalSchemaManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="global-schemas/create"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <SchemaForm isGlobal={true} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="global-schemas/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <SchemaForm isGlobal={true} />
                  </ProtectedRoute>
                }
              />

              {/* Operator Routes */}
              <Route
                path="operator"
                element={
                  <ProtectedRoute requiredRoles={["Operator"]}>
                    <OperatorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="orders"
                element={
                  <ProtectedRoute requiredRoles={["Operator"]}>
                    <div className="p-8 text-center">
                      <h1 className="text-2xl font-bold mb-4">
                        Order Processing
                      </h1>
                      <p className="text-gray-600">Coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Settings */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute requiredRoles={["Product Owner"]}>
                    <div className="p-8 text-center">
                      <h1 className="text-2xl font-bold mb-4">Settings</h1>
                      <p className="text-gray-600">Coming soon...</p>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </TenantSelectionProvider>
    </AuthProvider>
  );
}

export default App;
