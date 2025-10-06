import { API_CONFIG, apiRequest, ApiError } from "../config/api";
import type { ApiResponse } from "../types";

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

export interface Schema {
  id: number;
  name: string;
  description?: string;
  version: number;
  schemaFields: SchemaField[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SchemaListResponse {
  id: number;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  schemaFieldCount: number;
  createdAt: string;
  createdByName: string;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  schemaFields: CreateSchemaFieldRequest[];
}

export interface CreateSchemaFieldRequest {
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

export interface UpdateSchemaRequest {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  schemaFields: UpdateSchemaFieldRequest[];
}

export interface UpdateSchemaFieldRequest {
  id?: number; // Optional for new fields
  fieldName: string;
  fieldLabel: string;
  dataType: string;
  format?: string;
  isRequired: boolean;
  displayOrder: number;
  isDeleted?: boolean; // For marking fields as deleted
  MinLength?: number;
  MaxLength?: number;
  Precision?: number;
}

export const DATA_TYPES = [
  "string",
  "number",
  "dateTime",
  "date",
  "bool",
] as const;

export type DataType = (typeof DATA_TYPES)[number];

class SchemaService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));

      // Create ApiError to enable validation error handling
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }
    return response.json();
  }

  // Regular Schema Methods
  async getAllSchemas(): Promise<ApiResponse<SchemaListResponse[]>> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.SCHEMAS, {
        method: "GET",
      });
      const data = await this.handleResponse<SchemaListResponse[]>(response);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getSchemasByClientId(
    clientId: number
  ): Promise<ApiResponse<SchemaListResponse[]>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.SCHEMAS}?projectId=${clientId}`,
        {
          method: "GET",
        }
      );
      const data = await this.handleResponse<SchemaListResponse[]>(response);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getSchemaById(schemaId: number): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.SCHEMAS}/${schemaId}`,
        {
          method: "GET",
        }
      );
      const data = await this.handleResponse<Schema>(response);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async createSchema(
    request: CreateSchemaRequest
  ): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.SCHEMAS, {
        method: "POST",
        body: JSON.stringify({
          Name: request.name,
          Description: request.description || null,
          SchemaFields: request.schemaFields.map((field) => ({
            FieldName: field.fieldName,
            FieldLabel: field.fieldLabel,
            DataType: field.dataType,
            Format: field.format || null,
            IsRequired: field.isRequired,
            DisplayOrder: field.displayOrder,
          })),
        }),
      });

      const data = await this.handleResponse<Schema>(response);
      return { success: true, data, message: "Schema created successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create schema",
      };
    }
  }

  async updateSchema(
    request: UpdateSchemaRequest
  ): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.SCHEMAS}/${request.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            Name: request.name,
            Description: request.description || null,
            IsActive: request.isActive,
            SchemaFields: request.schemaFields
              .filter((field) => !field.isDeleted) // Only include non-deleted fields
              .map((field) => ({
                FieldName: field.fieldName,
                FieldLabel: field.fieldLabel,
                DataType: field.dataType,
                Format: field.format || null,
                IsRequired: field.isRequired,
                DisplayOrder: field.displayOrder,
              })),
          }),
        }
      );

      const data = await this.handleResponse<Schema>(response);
      return { success: true, data, message: "Schema updated successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update schema",
      };
    }
  }

  async deleteSchema(schemaId: number): Promise<void> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.SCHEMAS}/${schemaId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  async toggleSchemaStatus(
    schemaId: number,
    isActive: boolean
  ): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.SCHEMAS}/${schemaId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            IsActive: isActive,
          }),
        }
      );

      const data = await this.handleResponse<Schema>(response);
      return {
        success: true,
        data,
        message: `Schema ${isActive ? "activated" : "deactivated"} successfully`,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update schema status",
      };
    }
  }

  // Global Schema Methods for Product Owner
  async getAllGlobalSchemas(): Promise<ApiResponse<SchemaListResponse[]>> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS, {
        method: "GET",
      });
      const data = await this.handleResponse<SchemaListResponse[]>(response);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getGlobalSchemaById(schemaId: number): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS}/${schemaId}`,
        {
          method: "GET",
        }
      );
      const data = await this.handleResponse<Schema>(response);
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async createGlobalSchema(
    request: CreateSchemaRequest
  ): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS, {
        method: "POST",
        body: JSON.stringify({
          Name: request.name,
          Description: request.description || null,
          SchemaFields: request.schemaFields.map((field) => ({
            FieldName: field.fieldName,
            FieldLabel: field.fieldLabel,
            DataType: field.dataType,
            Format: field.format || null,
            IsRequired: field.isRequired,
            DisplayOrder: field.displayOrder,
          })),
        }),
      });

      const data = await this.handleResponse<Schema>(response);
      return {
        success: true,
        data,
        message: "Global schema created successfully",
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create global schema",
      };
    }
  }

  async updateGlobalSchema(
    request: UpdateSchemaRequest
  ): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS}/${request.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            Name: request.name,
            Description: request.description || null,
            IsActive: request.isActive,
            SchemaFields: request.schemaFields
              .filter((field) => !field.isDeleted) // Only include non-deleted fields
              .map((field) => ({
                FieldName: field.fieldName,
                FieldLabel: field.fieldLabel,
                DataType: field.dataType,
                Format: field.format || null,
                IsRequired: field.isRequired,
                DisplayOrder: field.displayOrder,
              })),
          }),
        }
      );

      const data = await this.handleResponse<Schema>(response);
      return {
        success: true,
        data,
        message: "Global schema updated successfully",
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update global schema",
      };
    }
  }

  async deleteGlobalSchema(schemaId: number): Promise<void> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS}/${schemaId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  async toggleGlobalSchemaStatus(
    schemaId: number,
    isActive: boolean
  ): Promise<ApiResponse<Schema>> {
    try {
      const response = await apiRequest(
        `${API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS}/${schemaId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            IsActive: isActive,
          }),
        }
      );

      const data = await this.handleResponse<Schema>(response);
      return {
        success: true,
        data,
        message: `Global schema ${isActive ? "activated" : "deactivated"} successfully`,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          errors: error.data?.errors,
          validationErrors: error.data?.validationErrors,
        };
      }
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update global schema status",
      };
    }
  }

  validateSchema(schema: CreateSchemaRequest | UpdateSchemaRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate schema name
    if (!schema.name || schema.name.trim().length === 0) {
      errors.push("Schema name is required");
    } else if (schema.name.length > 100) {
      errors.push("Schema name must be 100 characters or less");
    }

    // Validate description length
    if (schema.description && schema.description.length > 500) {
      errors.push("Schema description must be 500 characters or less");
    }

    // Validate schema fields
    if (!schema.schemaFields || schema.schemaFields.length === 0) {
      errors.push("At least one schema field is required");
    } else {
      // Check for duplicate field names
      const fieldNames = schema.schemaFields
        .filter((field) => !("isDeleted" in field) || !field.isDeleted)
        .map((field) => field.fieldName.trim().toLowerCase());
      const duplicateFieldNames = fieldNames.filter(
        (name, index) => fieldNames.indexOf(name) !== index
      );
      if (duplicateFieldNames.length > 0) {
        errors.push(
          `Duplicate field names found: ${[...new Set(duplicateFieldNames)].join(", ")}`
        );
      }

      // Check for duplicate display orders
      const displayOrders = schema.schemaFields
        .filter((field) => !("isDeleted" in field) || !field.isDeleted)
        .map((field) => field.displayOrder);
      const duplicateOrders = displayOrders.filter(
        (order, index) => displayOrders.indexOf(order) !== index
      );
      if (duplicateOrders.length > 0) {
        errors.push(
          `Duplicate display orders found: ${[...new Set(duplicateOrders)].join(", ")}`
        );
      }

      // Validate individual fields
      let activeFieldIndex = 0;
      schema.schemaFields.forEach((field) => {
        if (!("isDeleted" in field) || !field.isDeleted) {
          activeFieldIndex++;
          const fieldNumber = activeFieldIndex;

          if (!field.fieldName || field.fieldName.trim().length === 0) {
            errors.push(`Field ${fieldNumber}: Field name is required`);
          } else if (field.fieldName.length > 100) {
            errors.push(
              `Field ${fieldNumber}: Field name must be 100 characters or less`
            );
          }

          if (!field.fieldLabel || field.fieldLabel.trim().length === 0) {
            errors.push(`Field ${fieldNumber}: Field label is required`);
          } else if (field.fieldLabel.length > 255) {
            errors.push(
              `Field ${fieldNumber}: Field label must be 255 characters or less`
            );
          }

          const normalizedDataType = field.dataType?.toLowerCase().trim();
          const isValidDataType =
            normalizedDataType &&
            DATA_TYPES.some(
              (type) => type.toLowerCase() === normalizedDataType
            );

          if (!field.dataType || !isValidDataType) {
            errors.push(`Field ${fieldNumber}: Valid data type is required`);
          }

          if (field.format && field.format.length > 100) {
            errors.push(
              `Field ${fieldNumber}: Format must be 100 characters or less`
            );
          }

          if (field.displayOrder < 1) {
            errors.push(
              `Field ${fieldNumber}: Display order must be greater than 0`
            );
          }
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  getDataTypeDisplayName(dataType: string): string {
    const displayNames: Record<string, string> = {
      string: "String",
      number: "Number",
      dateTime: "Date & Time",
      date: "Date",
      bool: "Boolean",
    };
    return displayNames[dataType] || dataType;
  }

  sortSchemaFields(fields: SchemaField[]): SchemaField[] {
    return [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
  }
}

export const schemaService = new SchemaService();
