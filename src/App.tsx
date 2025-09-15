import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import FieldMapping from "./pages/FieldMapping";
import CreateFieldMapping from "./pages/CreateFieldMapping";
import SchemaManagement from "./pages/SchemaManagement";
import SchemaForm from "./pages/SchemaForm";
import ClientManagement from "./pages/ClientManagement";
import ClientForm from "./pages/ClientForm";
import CreateBatch from "./pages/CreateBatch";
import OperatorDashboard from "./pages/OperatorDashboard";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
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
            {/* Admin Routes */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute requiredRoles={["Admin", "Manager"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Manager Routes */}
            <Route
              path="batches"
              element={
                <ProtectedRoute requiredRoles={["Admin", "Manager"]}>
                  <CreateBatch />
                </ProtectedRoute>
              }
            />

            <Route
              path="clients"
              element={
                <ProtectedRoute requiredRoles={["Admin", "Manager"]}>
                  <ClientManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="clients/create"
              element={
                <ProtectedRoute requiredRoles={["Admin"]}>
                  <ClientForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="clients/edit/:id"
              element={
                <ProtectedRoute requiredRoles={["Admin"]}>
                  <ClientForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="schemas"
              element={
                <ProtectedRoute requiredRoles={["Admin"]}>
                  <SchemaManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="schemas/create"
              element={
                <ProtectedRoute requiredRoles={["Admin"]}>
                  <SchemaForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="schemas/edit/:id"
              element={
                <ProtectedRoute requiredRoles={["Admin"]}>
                  <SchemaForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="field-mapping"
              element={
                <ProtectedRoute requiredRoles={["Admin", "Manager"]}>
                  <FieldMapping />
                </ProtectedRoute>
              }
            />

            <Route
              path="field-mapping/create"
              element={
                <ProtectedRoute requiredRoles={["Admin", "Manager"]}>
                  <CreateFieldMapping />
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
                <ProtectedRoute requiredRoles={["Admin"]}>
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
    </AuthProvider>
  );
}

export default App;
