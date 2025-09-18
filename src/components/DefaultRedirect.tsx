import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserPrimaryRole } from "../config/navigation";

export const DefaultRedirect: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to appropriate default page based on role
  const userRoleString = getUserPrimaryRole(user);
  switch (userRoleString) {
    case "Product Owner":
    case "Admin": // Legacy support for Admin role
      return <Navigate to="/users" replace />;
    case "Tenant Owner":
      return <Navigate to="/dashboard" replace />;
    case "Operator":
      return <Navigate to="/operator" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};
