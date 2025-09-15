// User and Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export type UserRole = "Admin" | "Manager" | "Operator";

// Client Management Types
export interface Client {
  id: string;
  name: string;
  code: string;
  status: ClientStatus;
  schemas: Schema[];
  createdAt: Date;
  updatedAt: Date;
}

export type ClientStatus = "Draft" | "Ready" | "Active";

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
  clientId: string;
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
  clientId: string;
  client: Client;
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
  clientId: number;
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
  assignedTo?: string;
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
  clientId?: number;
  clientName?: string;
  hasValidationErrors?: boolean;
  documentCount?: number;
  fieldCount?: number;
  verifiedFieldCount?: number;
  completionPercentage?: number;
}

export type OrderStatus =
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Flagged"
  | "On Hold";
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
  totalClients: number;
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
