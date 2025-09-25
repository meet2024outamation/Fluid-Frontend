// User and Authentication Types
export interface User {
  id: number; // Changed from string to number to match C# int Id
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  roles: ProjectRole[];
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

export type UserRole = "Product Owner" | "Tenant Admin" | "Operator";

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
  id: string;
  key: string;
  dataType: FieldDataType;
  format?: string;
  required: boolean;
  description?: string;
}

export type FieldDataType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "email"
  | "phone"
  | "currency";

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
  id: string;
  field: string;
  message: string;
  severity: "Error" | "Warning";
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
  roles: UserRole[];
  children?: NavigationItem[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
