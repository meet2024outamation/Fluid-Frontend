import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Shield, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { rolesService } from "../services/rolesService";
import type { RoleWithPermissions, Permission, CreateRoleRequest } from "../types";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionFilter, setPermissionFilter] = useState("");
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    permissionIds: [] as number[]
  });
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filtered data
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredPermissions = permissions.filter(permission => {
    if (!permissionFilter) return true;
    return permission.name.toLowerCase().includes(permissionFilter.toLowerCase());
  });

  // Load data
  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await rolesService.getRoles();
      setRoles(rolesData);
    } catch (error) {
      showToast("Failed to load roles", "error");
      console.error("Error loading roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const permissionsData = await rolesService.getPermissions();
      setPermissions(permissionsData);
    } catch (error) {
      showToast("Failed to load permissions", "error");
      console.error("Error loading permissions:", error);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleCreateRole = async () => {
    try {
      if (!formData.name.trim()) {
        showToast("Role name is required", "error");
        return;
      }

      const roleData: CreateRoleRequest = {
        name: formData.name.trim(),
        permissionIds: formData.permissionIds
      };

      await rolesService.createRole(roleData);
      showToast("Role created successfully", "success");
      setIsCreateModalOpen(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      showToast(error.message || "Failed to create role", "error");
    }
  };

  const handleEditRole = async () => {
    try {
      if (!selectedRole || !formData.name.trim()) {
        showToast("Role name is required", "error");
        return;
      }

      const roleData = {
        name: formData.name.trim(),
        permissionIds: formData.permissionIds
      };

      await rolesService.updateRole(selectedRole.id, roleData);
      showToast("Role updated successfully", "success");
      setIsEditModalOpen(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      showToast(error.message || "Failed to update role", "error");
    }
  };

  const handleDeleteRole = async () => {
    try {
      if (!selectedRole) return;

      await rolesService.deleteRole(selectedRole.id);
      showToast("Role deleted successfully", "success");
      setIsDeleteModalOpen(false);
      setSelectedRole(null);
      loadRoles();
    } catch (error: any) {
      showToast(error.message || "Failed to delete role", "error");
    }
  };

  const openEditModal = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      permissionIds: role.permissions.map(p => p.id)
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      permissionIds: []
    });
    setSelectedRole(null);
  };

  const handlePermissionToggle = (permissionId: number) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles Management</h1>
          <p className="text-gray-600 mt-1">
            Manage roles and their permissions
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Roles Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {role.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {role.permissionCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {role.userCount || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(role)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(role)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? "Try adjusting your search criteria" : "Get started by creating a new role"}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Create Role Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Role"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter role name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="mb-3">
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search permissions..."
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
              {filteredPermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.permissionIds.includes(permission.id)}
                    onChange={() => handlePermissionToggle(permission.id)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {permission.name}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {formData.permissionIds.length} of {permissions.length} permissions selected
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateRole}>
              Create Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={`Edit Role: ${selectedRole?.name}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter role name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="mb-3">
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search permissions..."
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
              {filteredPermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.permissionIds.includes(permission.id)}
                    onChange={() => handlePermissionToggle(permission.id)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {permission.name}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {formData.permissionIds.length} of {permissions.length} permissions selected
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditRole}>
              Update Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRole(null);
        }}
        title="Delete Role"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Delete Role "{selectedRole?.name}"
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone. This will permanently delete the role and remove all associated permissions.
              </p>
              {selectedRole && selectedRole.userCount && selectedRole.userCount > 0 && (
                <p className="text-sm text-red-600 mt-2 font-medium">
                  Warning: This role is currently assigned to {selectedRole.userCount} user(s).
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
            >
              Delete Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-md shadow-lg ${
              toast.type === "success" 
                ? "bg-green-50 border border-green-200" 
                : "bg-red-50 border border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              toast.type === "success" ? "text-green-800" : "text-red-800"
            }`}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-2 ${
                toast.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesManagement;