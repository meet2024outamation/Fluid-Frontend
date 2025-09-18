import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Eye,
  X,
} from "lucide-react";
import type {
  User,
  CreateUserRequest,
  UserRequest,
  ProjectRole,
  TenantOption,
  ProjectOption,
  RoleOption,
} from "../types";
import { userService, type UserFilters } from "../services/userService.ts";
import { dropdownService } from "../services/dropdownService.ts";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Dropdown data state
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  // Role assignment state for create/edit form
  const [selectedRoles, setSelectedRoles] = useState<ProjectRole[]>([]);
  const [newRole, setNewRole] = useState<{
    tenantId: string;
    projectId: number;
    roleId: number;
  }>({
    tenantId: "",
    projectId: 0,
    roleId: 0,
  });

  const [formData, setFormData] = useState<CreateUserRequest>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    isActive: true,
    roles: [],
  });

  useEffect(() => {
    loadData();
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const [tenants, projects, roles] = await Promise.all([
        dropdownService.getTenantOptions(),
        dropdownService.getProjectOptions(),
        dropdownService.getRoleOptions(),
      ]);

      setTenantOptions(tenants);
      setProjectOptions(projects);
      setRoleOptions(roles);
    } catch (error: any) {
      console.error("Failed to load dropdown data:", error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, statsData] = await Promise.all([
        userService.getUsers(),
        userService.getUserStats(),
      ]);

      setUsers(usersData);
      setStats(statsData);
    } catch (error: any) {
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Role management helper functions
  const addRole = () => {
    if (newRole.tenantId && newRole.projectId && newRole.roleId) {
      const roleExists = selectedRoles.some(
        (role) =>
          role.tenantId === newRole.tenantId &&
          role.projectId === newRole.projectId &&
          role.roleId === newRole.roleId
      );

      if (!roleExists) {
        setSelectedRoles([...selectedRoles, { ...newRole }]);
        setNewRole({
          tenantId: "",
          projectId: 0,
          roleId: 0,
        });
      }
    }
  };

  const removeRole = (index: number) => {
    setSelectedRoles(selectedRoles.filter((_, i) => i !== index));
  };

  const getTenantName = (tenantId: string) => {
    const tenant = tenantOptions.find((t) => t.id === tenantId);
    return tenant?.name || tenantId;
  };

  const getProjectName = (projectId: number) => {
    const project = projectOptions.find((p) => p.id === projectId);
    return project?.name || `Project ${projectId}`;
  };

  const getRoleName = (roleId: number) => {
    const role = roleOptions.find((r) => r.id === roleId);
    return role?.name || `Role ${roleId}`;
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: UserFilters = {};

      if (searchTerm) filters.search = searchTerm;
      if (statusFilter === "active") filters.isActive = true;
      if (statusFilter === "inactive") filters.isActive = false;

      const filteredUsers = await userService.getUsers(filters);
      setUsers(filteredUsers);
    } catch (error: any) {
      setError(error.message || "Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!formData.email || !formData.firstName || !formData.lastName) {
        setError("Please fill in all required fields");
        return;
      }

      const userRequest: CreateUserRequest = {
        ...formData,
        roles: selectedRoles,
      };

      await userService.createUser(userRequest);
      setIsCreateDialogOpen(false);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        isActive: true,
        roles: [],
      });
      setSelectedRoles([]);
      loadData();
      setError(null);
    } catch (error: any) {
      setError(error.message || "Failed to create user");
    }
  };

  const handleEditUser = async () => {
    try {
      if (
        !selectedUser ||
        !formData.email ||
        !formData.firstName ||
        !formData.lastName
      ) {
        setError("Please fill in all required fields");
        return;
      }

      const userRequest: UserRequest = {
        ...formData,
        roles: selectedRoles,
      };

      await userService.updateUser(selectedUser.id, userRequest);
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        isActive: true,
        roles: [],
      });
      setSelectedRoles([]);
      loadData();
      setError(null);
    } catch (error: any) {
      setError(error.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      loadData();
      setError(null);
    } catch (error: any) {
      setError(error.message || "Failed to delete user");
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const updateData: UserRequest = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: !user.isActive,
        roles: user.roles,
      };
      await userService.updateUser(user.id, updateData);
      loadData();
      setError(null);
    } catch (error: any) {
      setError(error.message || "Failed to update user status");
    }
  };

  // Fetch user details from API
  const fetchUserDetails = async (userId: number): Promise<User | null> => {
    setLoadingUserDetails(true);
    try {
      const user = await userService.getUserById(userId);
      setLoadingUserDetails(false);
      return user;
    } catch (error: any) {
      setLoadingUserDetails(false);
      setError(error.message || "Failed to fetch user details");
      return null;
    }
  };

  const openViewDialog = async (user: User) => {
    const fullUser = await fetchUserDetails(user.id);
    if (fullUser) {
      setSelectedUser(fullUser);
      setIsViewDialogOpen(true);
    }
  };

  const openEditDialog = async (user: User) => {
    const fullUser = await fetchUserDetails(user.id);
    if (fullUser) {
      setSelectedUser(fullUser);
      setFormData({
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        phone: fullUser.phone || "",
        isActive: fullUser.isActive,
        roles: fullUser.roles,
      });
      setSelectedRoles(fullUser.roles);
      setIsEditDialogOpen(true);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center p-4">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.active}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <UserX className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inactive}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
          <CardDescription>
            Search and filter users by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "active" | "inactive"
                  )
                }
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch}>Search</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  loadData();
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage system users and their access
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Phone</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Created</th>
                  <th className="text-left p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{`${user.firstName} ${user.lastName}`}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.phone || "-"}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-2">{formatDate(user.createdAt)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewDialog(user)}
                          title="View User Details"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          title="Edit User"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Active User</span>
                </label>
              </div>

              {/* Role Assignment Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Role Assignments</h3>

                {/* Add New Role */}
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium mb-3">Add Role</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tenant *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRole.tenantId}
                        onChange={(e) =>
                          setNewRole((prev) => ({
                            ...prev,
                            tenantId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select Tenant</option>
                        {tenantOptions.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Project *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRole.projectId}
                        onChange={(e) =>
                          setNewRole((prev) => ({
                            ...prev,
                            projectId: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={0}>Select Project</option>
                        {projectOptions.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Role *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRole.roleId}
                        onChange={(e) =>
                          setNewRole((prev) => ({
                            ...prev,
                            roleId: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={0}>Select Role</option>
                        {roleOptions.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={addRole}
                    className="mt-3"
                    disabled={
                      !newRole.tenantId || !newRole.projectId || !newRole.roleId
                    }
                  >
                    Add Role
                  </Button>
                </div>

                {/* Selected Roles List */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigned Roles</h4>
                  {selectedRoles.length === 0 ? (
                    <div className="text-sm text-gray-500 italic border border-gray-200 rounded-md p-3">
                      No roles assigned yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRoles.map((role, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-blue-50 p-3 rounded-md"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {getRoleName(role.roleId)}
                            </div>
                            <div className="text-sm text-gray-600">
                              Tenant: {getTenantName(role.tenantId)} • Project:{" "}
                              {getProjectName(role.projectId)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleCreateUser} className="flex-1">
                Create User
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setFormData({
                    email: "",
                    firstName: "",
                    lastName: "",
                    phone: "",
                    isActive: true,
                    roles: [],
                  });
                  setSelectedRoles([]);
                  setNewRole({ tenantId: "", projectId: 0, roleId: 0 });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditDialogOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Active User</span>
                </label>
              </div>

              {/* Role Assignment Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Role Assignments</h3>

                {/* Add New Role */}
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium mb-3">Add Role</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tenant *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRole.tenantId}
                        onChange={(e) =>
                          setNewRole((prev) => ({
                            ...prev,
                            tenantId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select Tenant</option>
                        {tenantOptions.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Project *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRole.projectId}
                        onChange={(e) =>
                          setNewRole((prev) => ({
                            ...prev,
                            projectId: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={0}>Select Project</option>
                        {projectOptions.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Role *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newRole.roleId}
                        onChange={(e) =>
                          setNewRole((prev) => ({
                            ...prev,
                            roleId: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={0}>Select Role</option>
                        {roleOptions.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={addRole}
                    className="mt-3"
                    disabled={
                      !newRole.tenantId || !newRole.projectId || !newRole.roleId
                    }
                  >
                    Add Role
                  </Button>
                </div>

                {/* Selected Roles List */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigned Roles</h4>
                  {selectedRoles.length === 0 ? (
                    <div className="text-sm text-gray-500 italic border border-gray-200 rounded-md p-3">
                      No roles assigned yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRoles.map((role, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-blue-50 p-3 rounded-md"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {getRoleName(role.roleId)}
                            </div>
                            <div className="text-sm text-gray-600">
                              Tenant: {getTenantName(role.tenantId)} • Project:{" "}
                              {getProjectName(role.projectId)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleEditUser} className="flex-1">
                Update User
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedUser(null);
                  setFormData({
                    email: "",
                    firstName: "",
                    lastName: "",
                    phone: "",
                    isActive: true,
                    roles: [],
                  });
                  setSelectedRoles([]);
                  setNewRole({ tenantId: "", projectId: 0, roleId: 0 });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {isViewDialogOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">User Details</h2>
            {loadingUserDetails ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg">Loading user details...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                      {selectedUser.firstName}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                      {selectedUser.lastName}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    {selectedUser.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    {selectedUser.phone || "Not provided"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedUser.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created Date
                    </label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                      {formatDate(selectedUser.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Role Assignments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Assignments
                  </label>
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50 max-h-48 overflow-y-auto">
                    {selectedUser.roles && selectedUser.roles.length > 0 ? (
                      <div className="space-y-3">
                        {selectedUser.roles.map((role, index) => (
                          <div
                            key={index}
                            className="bg-white p-3 rounded border"
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              {getRoleName(role.roleId)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <div>Tenant: {role.tenantId}</div>
                              <div>Project: Project {role.projectId}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic text-center py-4">
                        No roles assigned
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewDialogOpen(false);
                  setSelectedUser(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
