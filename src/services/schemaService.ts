import { API_CONFIG, apiRequest } from "../config/api";

export interface SchemaField {
  id: number;
  fieldName: string;
  fieldLabel: string;
  dataType: string;
  format?: string;
  isRequired: boolean;
  displayOrder: number;
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
}

export const DATA_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "decimal",
  "email",
  "url",
  "phone",
  "currency",
  "text",
  "longtext",
] as const;

export type DataType = (typeof DATA_TYPES)[number];

class SchemaService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }
    return response.json();
  }

  // Regular Schema Methods
  async getAllSchemas(): Promise<SchemaListResponse[]> {
    const response = await apiRequest(API_CONFIG.ENDPOINTS.SCHEMAS, {
      method: "GET",
    });
    return this.handleResponse<SchemaListResponse[]>(response);
  }

  async getSchemasByClientId(clientId: number): Promise<SchemaListResponse[]> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.SCHEMAS}?projectId=${clientId}`,
      {
        method: "GET",
      }
    );
    return this.handleResponse<SchemaListResponse[]>(response);
  }

  async getSchemaById(schemaId: number): Promise<Schema> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.SCHEMAS}/${schemaId}`,
      {
        method: "GET",
      }
    );
    return this.handleResponse<Schema>(response);
  }

  async createSchema(request: CreateSchemaRequest): Promise<Schema> {
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

    return this.handleResponse<Schema>(response);
  }

  async updateSchema(request: UpdateSchemaRequest): Promise<Schema> {
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

    return this.handleResponse<Schema>(response);
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
  ): Promise<Schema> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.SCHEMAS}/${schemaId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          IsActive: isActive,
        }),
      }
    );

    return this.handleResponse<Schema>(response);
  }

  // Global Schema Methods for Product Owner
  async getAllGlobalSchemas(): Promise<SchemaListResponse[]> {
    const response = await apiRequest(API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS, {
      method: "GET",
    });
    return this.handleResponse<SchemaListResponse[]>(response);
  }

  async getGlobalSchemaById(schemaId: number): Promise<Schema> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS}/${schemaId}`,
      {
        method: "GET",
      }
    );
    return this.handleResponse<Schema>(response);
  }

  async createGlobalSchema(request: CreateSchemaRequest): Promise<Schema> {
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

    return this.handleResponse<Schema>(response);
  }

  async updateGlobalSchema(request: UpdateSchemaRequest): Promise<Schema> {
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

    return this.handleResponse<Schema>(response);
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
  ): Promise<Schema> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.GLOBAL_SCHEMAS}/${schemaId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          IsActive: isActive,
        }),
      }
    );

    return this.handleResponse<Schema>(response);
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
      boolean: "Boolean",
      date: "Date",
      datetime: "Date & Time",
      decimal: "Decimal",
      email: "Email",
      url: "URL",
      phone: "Phone",
      currency: "Currency",
      text: "Text",
      longtext: "Long Text",
    };
    return displayNames[dataType] || dataType;
  }

  sortSchemaFields(fields: SchemaField[]): SchemaField[] {
    return [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
  }
}

export const schemaService = new SchemaService();
