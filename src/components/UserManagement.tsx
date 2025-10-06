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
  userSchema,
  validateSingleField,
  type UserFormData,
} from "../utils/validation";
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
import { useAuth } from "../contexts/AuthContext";

const UserManagement: React.FC = () => {
  const { user: currentUser, accessibleTenants } = useAuth();
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
  const [dataLoaded, setDataLoaded] = useState(false);

  // Dropdown data state
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [dropdownsLoaded, setDropdownsLoaded] = useState(false);

  // Role assignment state for create/edit form
  const [selectedRoles, setSelectedRoles] = useState<ProjectRole[]>([]);
  const [newRole, setNewRole] = useState<{
    tenantIds: string[];
    projectIds: number[];
    roleId: number;
  }>({
    tenantIds: [],
    projectIds: [],
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

  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    roleId?: string;
  }>({});

  useEffect(() => {
    if (!dataLoaded) {
      loadData();
    }
  }, [dataLoaded]);

  useEffect(() => {
    if (
      (isCreateDialogOpen || isEditDialogOpen) &&
      !dropdownsLoaded &&
      currentUser
    ) {
      loadDropdownData();
    }
  }, [isCreateDialogOpen, isEditDialogOpen, dropdownsLoaded, currentUser]);

  // Handle body overflow when modals are open
  useEffect(() => {
    if (isCreateDialogOpen || isEditDialogOpen || isViewDialogOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "15px";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
    }

    // Cleanup function to reset styles
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
    };
  }, [isCreateDialogOpen, isEditDialogOpen, isViewDialogOpen]);

  const loadDropdownData = async () => {
    try {
      const [tenants, projects, roles] = await Promise.all([
        dropdownService.getTenantOptions(),
        dropdownService.getProjectOptions(undefined, accessibleTenants),
        dropdownService.getRoleOptions(),
      ]);

      setTenantOptions(tenants);
      setProjectOptions(projects);
      setRoleOptions(roles);
      setDropdownsLoaded(true);
    } catch (error: any) {
      setError(error.message || "Failed to load dropdown data");
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
      setDataLoaded(true);
    } catch (error: any) {
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Role management helper functions
  const addRole = () => {
    // Validate based on role type using role names instead of hardcoded IDs
    const selectedRole = roleOptions.find((r: any) => r.id === newRole.roleId);
    const isProductOwner = selectedRole?.name === "Product Owner";
    const isTenantAdmin = selectedRole?.name === "Tenant Admin";

    // Check if required fields are filled based on role
    const isValid =
      newRole.roleId > 0 &&
      (isProductOwner || newRole.tenantIds.length > 0) &&
      (isProductOwner || isTenantAdmin || newRole.projectIds.length > 0);

    if (isValid) {
      if (isProductOwner) {
        // For Product Owner, create a single role entry with null values
        const newProjectRole: ProjectRole = {
          roleId: newRole.roleId,
          tenantId: null, // Product Owner doesn't need tenant
          projectId: null, // Product Owner doesn't need project
        };
        setSelectedRoles([...selectedRoles, newProjectRole]);
      } else if (isTenantAdmin) {
        // For Tenant Admin, add role for each selected tenant with null projectId
        newRole.tenantIds.forEach((tenantId) => {
          const newProjectRole: ProjectRole = {
            roleId: newRole.roleId,
            tenantId: tenantId,
            projectId: null, // Tenant Admin doesn't need project
          };
          setSelectedRoles((prev) => [...prev, newProjectRole]);
        });
      } else {
        // For other roles, add role for each combination of selected tenants and projects
        newRole.tenantIds.forEach((tenantId) => {
          newRole.projectIds.forEach((projectId) => {
            const newProjectRole: ProjectRole = {
              roleId: newRole.roleId,
              tenantId: tenantId,
              projectId: projectId,
            };
            setSelectedRoles((prev) => [...prev, newProjectRole]);
          });
        });
      }

      // Reset the form
      setNewRole({
        tenantIds: [],
        projectIds: [],
        roleId: 0,
      });
    }
  };

  const removeRole = (index: number) => {
    setSelectedRoles(selectedRoles.filter((_, i) => i !== index));
  };

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return "N/A";
    const tenant = tenantOptions.find((t) => t.id === tenantId);
    return tenant?.name || tenantId;
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return "N/A";
    const project = projectOptions.find((p) => p.id === projectId);
    return project?.name || `Project ${projectId}`;
  };

  // Helper function to get projects for selected tenants
  const getFilteredProjects = () => {
    if (newRole.tenantIds.length === 0) {
      return [];
    }
    const filtered = projectOptions.filter((project) =>
      newRole.tenantIds.includes(project.tenantId)
    );
    console.log("Filtering projects:", {
      selectedTenantIds: newRole.tenantIds,
      allProjects: projectOptions,
      filteredProjects: filtered,
    });
    return filtered;
  };

  // Helper function to handle tenant selection
  const handleTenantSelection = (tenantId: string, isSelected: boolean) => {
    if (isSelected) {
      setNewRole((prev) => ({
        ...prev,
        tenantIds: [...prev.tenantIds, tenantId],
      }));
    } else {
      setNewRole((prev) => ({
        ...prev,
        tenantIds: prev.tenantIds.filter((id) => id !== tenantId),
        projectIds: prev.projectIds.filter((projectId) => {
          const project = projectOptions.find((p) => p.id === projectId);
          return project?.tenantId !== tenantId;
        }),
      }));
    }
  };

  // Helper function to handle project selection
  const handleProjectSelection = (projectId: number, isSelected: boolean) => {
    if (isSelected) {
      setNewRole((prev) => ({
        ...prev,
        projectIds: [...prev.projectIds, projectId],
      }));
    } else {
      setNewRole((prev) => ({
        ...prev,
        projectIds: prev.projectIds.filter((id) => id !== projectId),
      }));
    }
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

  // Validation functions using Zod
  const validateForm = () => {
    try {
      const userFormData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        roleId: selectedRoles.length > 0 ? selectedRoles[0].roleId : 0,
      };
      userSchema.parse(userFormData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof Error && "issues" in error) {
        const zodError = error as any;
        const errors: typeof validationErrors = {};

        zodError.issues.forEach((issue: any) => {
          const field = issue.path[0];
          if (field in errors) {
            errors[field as keyof typeof errors] = issue.message;
          }
        });

        setValidationErrors(errors);
      }
      return false;
    }
  };

  // Validate individual field on change
  const validateFieldOnChange = (fieldName: keyof UserFormData, value: any) => {
    const error = validateSingleField(userSchema, fieldName, value);
    setValidationErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleCreateUser = async () => {
    try {
      if (!validateForm()) {
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
      setValidationErrors({});
      setSelectedRoles([]);
      loadData();
      setDataLoaded(false); // Allow fresh data reload
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
      setDataLoaded(false); // Allow fresh data reload
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
      setDataLoaded(false); // Allow fresh data reload
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
      setDataLoaded(false); // Allow fresh data reload
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
        <div className="text-lg">Loading...</div>
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
                  setDataLoaded(false); // Allow fresh data reload
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
                  <th className="text-left p-2 font-medium">Roles</th>
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
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.slice(0, 2).map((role, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              title={`${getRoleName(role.roleId)}${role.tenantId ? ` - ${getTenantName(role.tenantId)}` : ""}${role.projectId ? ` - ${getProjectName(role.projectId)}` : ""}`}
                            >
                              {getRoleName(role.roleId)}
                              {role.tenantId && (
                                <span className="ml-1 text-blue-600">
                                  (
                                  {getTenantName(role.tenantId).substring(0, 8)}
                                  {getTenantName(role.tenantId).length > 8
                                    ? "..."
                                    : ""}
                                  )
                                </span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No roles
                          </span>
                        )}
                        {user.roles && user.roles.length > 2 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{user.roles.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.firstName
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.firstName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      firstName: value,
                    }));
                    validateFieldOnChange("firstName", value);
                  }}
                />
                {validationErrors.firstName && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.lastName
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.lastName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      lastName: value,
                    }));
                    validateFieldOnChange("lastName", value);
                  }}
                />
                {validationErrors.lastName && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.email
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  }`}
                  value={formData.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      email: value,
                    }));
                    validateFieldOnChange("email", value);
                  }}
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
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

              {/* Role Assignment Section for Create Modal */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Role Assignments</h3>

                {/* Add New Role */}
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium mb-3">Add Role</h4>
                  <div className="space-y-3">
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
                            tenantIds: [],
                            projectIds: [],
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

                    {/* Show tenant selection for Tenant Admin (id: 2) and other roles except Product Owner (id: 1) (see config/roles.ts) */}
                    {newRole.roleId !== 0 && newRole.roleId !== 1 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Tenants *
                        </label>
                        <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                          {tenantOptions.map((tenant) => (
                            <label
                              key={tenant.id}
                              className="flex items-center space-x-2 p-1 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={newRole.tenantIds.includes(tenant.id)}
                                onChange={(e) =>
                                  handleTenantSelection(
                                    tenant.id,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{tenant.name}</span>
                            </label>
                          ))}
                        </div>
                        {newRole.tenantIds.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">
                              Selected:{" "}
                              {newRole.tenantIds
                                .map(
                                  (id) =>
                                    tenantOptions.find((t) => t.id === id)?.name
                                )
                                .join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show project selection only for roles other than Product Owner (id: 1) and Tenant Admin (id: 2) (see config/roles.ts) */}
                    {newRole.roleId !== 0 &&
                      newRole.roleId !== 1 &&
                      newRole.roleId !== 2 && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Projects *
                          </label>
                          <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                            {getFilteredProjects().map((project) => (
                              <label
                                key={project.id}
                                className="flex items-start space-x-3 p-3 hover:bg-gray-50 cursor-pointer rounded-md border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={newRole.projectIds.includes(
                                    project.id
                                  )}
                                  onChange={(e) =>
                                    handleProjectSelection(
                                      project.id,
                                      e.target.checked
                                    )
                                  }
                                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {project.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium">Tenant:</span>{" "}
                                    {getTenantName(project.tenantId)}
                                  </div>
                                </div>
                              </label>
                            ))}
                            {getFilteredProjects().length === 0 && (
                              <div className="text-sm text-gray-500 italic p-3 text-center">
                                No projects available for selected tenants
                              </div>
                            )}
                          </div>
                          {newRole.projectIds.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md">
                              <p className="text-xs text-blue-800 font-medium mb-1">
                                Selected Projects:
                              </p>
                              <div className="text-xs text-blue-700">
                                {newRole.projectIds
                                  .map((id) => {
                                    const project = projectOptions.find(
                                      (p) => p.id === id
                                    );
                                    return project
                                      ? `${project.name} (${getTenantName(project.tenantId)})`
                                      : `Project ${id}`;
                                  })
                                  .join(", ")}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  <Button
                    onClick={addRole}
                    className="mt-3"
                    disabled={
                      !newRole.roleId ||
                      (newRole.roleId !== 1 &&
                        newRole.tenantIds.length === 0) ||
                      (newRole.roleId !== 1 &&
                        newRole.roleId !== 2 &&
                        newRole.projectIds.length === 0)
                    }
                  >
                    Add Role
                  </Button>
                </div>

                {/* Selected Roles List for Create Modal */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigned Roles</h4>
                  {selectedRoles.length === 0 ? (
                    <div className="text-sm text-gray-500 italic border border-gray-200 rounded-md p-3">
                      No roles assigned yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedRoles.map((role, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between bg-blue-50 p-3 rounded-md border border-blue-100"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-blue-900 mb-1">
                              {getRoleName(role.roleId)}
                            </div>
                            <div className="text-sm text-blue-700 space-y-1">
                              {role.tenantId && (
                                <div className="flex items-center">
                                  <span className="font-medium text-blue-800">
                                    Tenant:
                                  </span>
                                  <span className="ml-1">
                                    {getTenantName(role.tenantId)}
                                  </span>
                                </div>
                              )}
                              {role.projectId && (
                                <div className="flex items-center">
                                  <span className="font-medium text-blue-800">
                                    Project:
                                  </span>
                                  <span className="ml-1">
                                    {getProjectName(role.projectId)}
                                  </span>
                                </div>
                              )}
                              {role.roleId === 1 && (
                                <div className="text-blue-600 text-xs">
                                  Global access across all tenants and projects
                                </div>
                              )}
                              {role.roleId === 2 && (
                                <div className="text-blue-600 text-xs">
                                  Access to all projects within tenant
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(index)}
                            className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                  setNewRole({ tenantIds: [], projectIds: [], roleId: 0 });
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
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

              {/* Role Assignment Section for Edit Modal */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Role Assignments</h3>

                {/* Add New Role */}
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium mb-3">Add Role</h4>
                  <div className="space-y-3">
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
                            tenantIds: [],
                            projectIds: [],
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

                    {/* Show tenant selection for Tenant Admin (id: 2) and other roles except Product Owner (id: 1) */}
                    {newRole.roleId !== 0 && newRole.roleId !== 1 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Tenants *
                        </label>
                        <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                          {tenantOptions.map((tenant) => (
                            <label
                              key={tenant.id}
                              className="flex items-center space-x-2 p-1 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={newRole.tenantIds.includes(tenant.id)}
                                onChange={(e) =>
                                  handleTenantSelection(
                                    tenant.id,
                                    e.target.checked
                                  )
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm">{tenant.name}</span>
                            </label>
                          ))}
                        </div>
                        {newRole.tenantIds.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">
                              Selected:{" "}
                              {newRole.tenantIds
                                .map(
                                  (id) =>
                                    tenantOptions.find((t) => t.id === id)?.name
                                )
                                .join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show project selection only for roles other than Product Owner (id: 1) and Tenant Admin (id: 2) */}
                    {newRole.roleId !== 0 &&
                      newRole.roleId !== 1 &&
                      newRole.roleId !== 2 && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Projects *
                          </label>
                          <div className="border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
                            {getFilteredProjects().map((project) => (
                              <label
                                key={project.id}
                                className="flex items-start space-x-3 p-3 hover:bg-gray-50 cursor-pointer rounded-md border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={newRole.projectIds.includes(
                                    project.id
                                  )}
                                  onChange={(e) =>
                                    handleProjectSelection(
                                      project.id,
                                      e.target.checked
                                    )
                                  }
                                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {project.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium">Tenant:</span>{" "}
                                    {getTenantName(project.tenantId)}
                                  </div>
                                </div>
                              </label>
                            ))}
                            {getFilteredProjects().length === 0 && (
                              <div className="text-sm text-gray-500 italic p-3 text-center">
                                No projects available for selected tenants
                              </div>
                            )}
                          </div>
                          {newRole.projectIds.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md">
                              <p className="text-xs text-blue-800 font-medium mb-1">
                                Selected Projects:
                              </p>
                              <div className="text-xs text-blue-700">
                                {newRole.projectIds
                                  .map((id) => {
                                    const project = projectOptions.find(
                                      (p) => p.id === id
                                    );
                                    return project
                                      ? `${project.name} (${getTenantName(project.tenantId)})`
                                      : `Project ${id}`;
                                  })
                                  .join(", ")}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  <Button
                    onClick={addRole}
                    className="mt-3"
                    disabled={
                      !newRole.roleId ||
                      (newRole.roleId !== 1 &&
                        newRole.tenantIds.length === 0) ||
                      (newRole.roleId !== 1 &&
                        newRole.roleId !== 2 &&
                        newRole.projectIds.length === 0)
                    }
                  >
                    Add Role
                  </Button>
                </div>

                {/* Selected Roles List for Edit Modal */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigned Roles</h4>
                  {selectedRoles.length === 0 ? (
                    <div className="text-sm text-gray-500 italic border border-gray-200 rounded-md p-3">
                      No roles assigned yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedRoles.map((role, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between bg-blue-50 p-3 rounded-md border border-blue-100"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-blue-900 mb-1">
                              {getRoleName(role.roleId)}
                            </div>
                            <div className="text-sm text-blue-700 space-y-1">
                              {role.tenantId && (
                                <div className="flex items-center">
                                  <span className="font-medium text-blue-800">
                                    Tenant:
                                  </span>
                                  <span className="ml-1">
                                    {getTenantName(role.tenantId)}
                                  </span>
                                </div>
                              )}
                              {role.projectId && (
                                <div className="flex items-center">
                                  <span className="font-medium text-blue-800">
                                    Project:
                                  </span>
                                  <span className="ml-1">
                                    {getProjectName(role.projectId)}
                                  </span>
                                </div>
                              )}
                              {role.roleId === 1 && (
                                <div className="text-blue-600 text-xs">
                                  Global access across all tenants and projects
                                </div>
                              )}
                              {role.roleId === 2 && (
                                <div className="text-blue-600 text-xs">
                                  Access to all projects within tenant
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRole(index)}
                            className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                  setNewRole({ tenantIds: [], projectIds: [], roleId: 0 });
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
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

                {/* Role Assignments Display */}
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
                            className="bg-white p-3 rounded border border-gray-100"
                          >
                            <div className="font-medium text-gray-900 mb-2">
                              {getRoleName(role.roleId)}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {/* Show tenant details if tenantId exists */}
                              {role.tenantId && (
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-700">
                                    Tenant:
                                  </span>
                                  <span className="ml-1">
                                    {getTenantName(role.tenantId)}
                                  </span>
                                </div>
                              )}
                              {/* Show project details if projectId exists */}
                              {role.projectId && (
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-700">
                                    Project:
                                  </span>
                                  <span className="ml-1">
                                    {getProjectName(role.projectId)}
                                  </span>
                                </div>
                              )}
                              {/* Role scope descriptions */}
                              {role.roleName === "Product Owner" && (
                                <div className="text-green-600 text-xs bg-green-50 p-2 rounded">
                                  <strong>Global Access:</strong> Full access to
                                  all tenants and projects across the system
                                </div>
                              )}
                              {role.roleName === "Tenant Admin" && (
                                <div className="text-blue-600 text-xs bg-blue-50 p-2 rounded">
                                  <strong>Tenant Access:</strong> Full access to
                                  all projects within this tenant
                                </div>
                              )}
                              {role.roleName &&
                                !["Product Owner", "Tenant Admin"].includes(
                                  role.roleName
                                ) && (
                                  <div className="text-purple-600 text-xs bg-purple-50 p-2 rounded">
                                    <strong>Project Access:</strong> Specific
                                    access to this project within the tenant
                                  </div>
                                )}
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
