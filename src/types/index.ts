// User and Authentication Types - Updated for dynamic roles/permissions
export interface UserRole {
  roleId: number;
  roleName: string;
  description?: string;
}

export interface UserPermission {
  id: number;
  name: string;
  description?: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  roles: UserRole[];
  permissions: UserPermission[];
  currentTenantId?: string;
  currentTenantName?: string;
  currentProjectId?: string | null;
  currentProjectName?: string | null;
}

// Legacy User interface for backward compatibility
export interface User {
  id: number; // Changed from string to number to match C# int Id
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  roles: ProjectRole[];
  permissions?: LegacyUserPermission[]; // Add permissions for access control
  createdAt: Date;
  updatedAt?: Date; // Made optional to match C# DateTime?
}

export interface UserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  roles: ProjectRole[];
}

export interface CreateUserRequest extends UserRequest {}

export interface UpdateUserRequest extends UserRequest {
  id: number;
}

export interface ProjectRole {
  tenantId: string | null;
  projectId: number | null;
  roleId: number;
  tenantName?: string;
  projectName?: string;
  roleName?: string;
  permissions?: string[]; // Permissions associated with this role
}

// Legacy permission-related types for backward compatibility
export interface LegacyUserPermission {
  id: number;
  name: string;
  resource?: string;
  action?: string;
}

// Permission info from backend
export interface PermissionInfo {
  Id: number;
  Name: string;
  Description?: string;
}

// User role info from backend
export interface UserRoleInfo {
  Id: number;
  Name: string;
  Description?: string;
  Permissions?: PermissionInfo[];
}

// Me API Response structure
export interface UserMeResponse {
  Id: number;
  Email: string;
  FirstName: string;
  LastName: string;
  Phone?: string;
  IsActive: boolean;
  Roles: UserRoleInfo[];
  Permissions: PermissionInfo[];
  CurrentTenantId?: string;
  CurrentTenantName?: string;
  CurrentProjectId?: number;
  CurrentProjectName?: string;
  CreatedAt: string;
  UpdatedAt?: string;
}

// Route permission configuration
export interface RoutePermission {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
}

// Types for dropdown data in forms
export interface TenantOption {
  id: string;
  name: string;
}

export interface ProjectOption {
  id: number;
  name: string;
  tenantId: string;
}

export interface RoleOption {
  id: number;
  name: string;
}

// Accessible Tenants Response Types
export interface AccessibleTenantsResponse {
  userId: number;
  userName: string;
  email: string;
  isProductOwner: boolean;
  tenantAdminIds: TenantAdminInfo[];
  tenants: AccessibleTenant[];
}

export interface TenantAdminInfo {
  tenantId: string;
  tenantName: string;
  tenantIdentifier: string;
  description?: string | null;
  isActive: boolean;
}

export interface AccessibleTenant {
  tenantId: string;
  tenantName: string;
  tenantIdentifier: string;
  description?: string;
  userRoles: string[];
  projects: AccessibleProject[];
  projectCount: number;
}

export interface AccessibleProject {
  projectId: number;
  projectName: string;
  projectCode?: string;
  description?: string;
  isActive: boolean;
  userRoles: string[];
  createdAt: Date;
}

// Tenant Management Types
export interface Tenant {
  id: string;
  identifier: string;
  name: string;
  description?: string;
  databaseName?: string;
  properties?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  projectCount: number;
}

export interface CreateTenantRequest {
  identifier: string;
  name: string;
  description?: string | null;
  databaseName: string;
  properties?: string | null;
}

export interface UpdateTenantRequest {
  identifier: string;
  name: string;
  description?: string | null;
  databaseName: string;
  properties?: string | null;
}

// Project Management Types
export interface Project {
  id: string;
  name: string;
  code: string;
  status: ProjectStatus;
  schemas: Schema[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = "Draft" | "Ready" | "Active";

// Schema Types
export interface Schema {
  id: string;
  name: string;
  type: SchemaType;
  fields: SchemaField[];
  isStandardized: boolean;
  createdAt: Date;
}

export type SchemaType =
  | "Deed"
  | "Mortgage"
  | "Claim"
  | "Paystub"
  | "Invoice"
  | "Contract"
  | "Other";

export interface SchemaField {
  id: number;
  fieldName: string;
  fieldLabel: string;
  dataType: string;
  format?: string;
  isRequired: boolean;
  displayOrder: number;
  MinLength?: number;
  MaxLength?: number;
  Precision?: number;
}

export type FieldDataType = "string" | "number" | "dateTime" | "date" | "bool";

// Field Mapping Types
export interface FieldMapping {
  id: string;
  projectId: string;
  inputField: string;
  schemaField: SchemaField;
  confidence: number;
  isManualOverride: boolean;
}

export interface CSVColumn {
  name: string;
  index: number;
  sampleValues: string[];
}

// Batch Management Types
export interface Batch {
  id: string;
  projectId: string;
  project: Project;
  receivedDate: Date;
  status: BatchStatus;
  totalOrders: number;
  completedOrders: number;
  orders: Order[];
  validationErrors?: ValidationError[];
}

export type BatchStatus =
  | "Pending"
  | "Processing"
  | "Ready"
  | "Completed"
  | "Error";

export interface ValidationError {
  key: string;
  errorMessage: string;
  severity: number; // 0 = Error, 1 = Warning
}

// Legacy validation error (keep for backward compatibility)
export interface LegacyValidationError {
  id: string;
  field: string;
  message: string;
  severity: "Error" | "Warning";
}

// Legacy API Error Response Types (for backward compatibility)
export interface LegacyApiErrorResponse {
  message?: string;
  validationErrors?: ValidationError[];
  errors?: Record<string, string[]>; // ASP.NET Core model validation format
}

// Form validation error mapping
export interface FormValidationError {
  field: string;
  message: string;
  type: "server" | "client";
  severity: "error" | "warning";
}

// Batch Creation Types
export interface CreateBatchFormData {
  fileName: string;
  projectId: number;
  name: string;
  description: string;
  metadataFile: File | null;
  documents: File[];
}

export interface BatchCreationStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

// Order Processing Types
export interface Order {
  id: string;
  batchId: string;
  assignedTo?: number;
  status: OrderStatus;
  priority: OrderPriority;
  documents: Document[];
  keyingData: KeyingData;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  estimatedTime?: number;

  // Additional fields from API
  assignedUserName?: string;
  startedAt?: Date;
  updatedAt?: Date;
  projectId?: number;
  projectName?: string;
  hasValidationErrors?: boolean;
  documentCount?: number;
  fieldCount?: number;
  verifiedFieldCount?: number;
  completionPercentage?: number;
}

export type OrderStatus =
  // Original statuses (for backward compatibility)
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Flagged"
  | "On Hold"
  // New workflow statuses
  | "Created"
  | "ValidationError"
  | "ReadyForAI"
  | "AIProcessing"
  | "ReadyForAssignment"
  | "QCRequired"
  | "Error";
export type OrderPriority = "Low" | "Normal" | "High" | "Urgent";

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  pages: number;
  uploadedAt: Date;
}

export interface KeyingData {
  [fieldKey: string]: KeyingFieldValue;
}

export interface KeyingFieldValue {
  value: any;
  confidence: number;
  isManual: boolean;
  validationErrors?: string[];
}

// Dashboard Types
export interface DashboardStats {
  totalProjects: number;
  activeBatches: number;
  pendingOrders: number;
  completedOrders: number;
  dailyProductivity: ProductivityMetric[];
}

export interface ProductivityMetric {
  date: string;
  ordersProcessed: number;
  averageTime: number;
  accuracy: number;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  // PREFERRED: Permission-based access control
  requiredPermissions?: string[]; // Permissions required to access this item
  requireAllPermissions?: boolean; // If true, user must have ALL permissions; if false, ANY permission
  // LEGACY: Role-based access control (kept for backward compatibility)
  roles?: string[]; // Dynamic role names from backend
  permission?: string; // Single permission required (alias for requiredPermissions with single item)
  permissions?: string[]; // Multiple permissions (alias for requiredPermissions)
  children?: NavigationItem[];
}

// Standardized API Response Types (based on project/order flow management)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]> | string[]; // Support both ASP.NET Core and array formats
  validationErrors?: ValidationError[];
  status?: number;
}

// Error Response Types
export interface ApiErrorResponse {
  success: false;
  message?: string;
  error?: string;
  errors?: Record<string, string[]> | string[];
  validationErrors?: ValidationError[];
  status: number;
}

// Success Response Types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  status?: number;
}

// Notification Types
export interface NotificationOptions {
  duration?: number;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  showIcon?: boolean;
  closable?: boolean;
}

export interface NotificationMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  timestamp: number;
  options?: NotificationOptions;
}

// Form Integration Types
export interface FormFieldMapping {
  [backendField: string]: string; // backend field -> frontend field
}

export interface FormNotificationResult {
  mappedToFields: number;
  unmappedErrors: ValidationError[];
  totalErrors: number;
}

// Enhanced Validation Error Handler Types
export interface ValidationErrorHandler {
  handleValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;
  hasValidationErrors: boolean;
}

// Form Error Handler Types
export interface FormErrorSetter {
  (field: string, error: { type: string; message: string }): void;
}

export interface FormErrorClearer {
  (field?: string): void;
}

// Notification Service Types
export interface NotificationService {
  success: (message: string, options?: NotificationOptions) => string;
  error: (message: string, options?: NotificationOptions) => string;
  warning: (message: string, options?: NotificationOptions) => string;
  info: (message: string, options?: NotificationOptions) => string;
  remove: (id: string) => void;
  clear: () => void;
  handleApiResponse: <T>(
    response: ApiResponse<T>,
    options?: NotificationOptions
  ) => void;
  handleApiError: (
    error: ApiErrorResponse,
    formErrorSetter?: FormErrorSetter,
    fieldMapping?: FormFieldMapping
  ) => FormNotificationResult;
}

// Toast notification types for validation errors
export interface ValidationToast {
  id: string;
  message: string;
  type: "error" | "warning";
  field?: string;
  duration?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and Search Types
export interface FilterOptions {
  search?: string;
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  assignedTo?: string[];
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

// Order Flow Management Types
export interface OrderFlowStep {
  id: string;
  status: OrderStatus;
  rank: number;
  isActive: boolean;
  label: string;
  description?: string;
}

export interface TenantOrderFlow {
  id: string;
  tenantId: string;
  steps: OrderFlowStep[];
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateTenantOrderFlowRequest {
  tenantId: string;
  steps: Omit<OrderFlowStep, "id">[];
}

export interface UpdateTenantOrderFlowRequest {
  id: string;
  steps: OrderFlowStep[];
}

export interface OrderFlowPreview {
  activeSteps: OrderFlowStep[];
  totalSteps: number;
  estimatedDuration?: number;
}

// Role Management Types
export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: number;
  name: string;
}

export interface CreateRoleRequest {
  name: string;
  permissionIds: number[];
}

export interface UpdateRoleRequest {
  id: number;
  name: string;
  permissionIds: number[];
}

export interface RoleWithPermissions extends Role {
  permissionCount: number;
  userCount?: number;
}
