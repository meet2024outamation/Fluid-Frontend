const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7253";

export interface FieldMappingItem {
  schemaFieldId: number;
  inputField: string;
  transformation?: string;
}

export interface CreateBulkFieldMappingRequest {
  clientId: number;
  schemaId: number;
  fieldMappings: FieldMappingItem[];
}

export interface CreateBulkFieldMappingResponse {
  id: number;
  clientId: number;
  schemaId: number;
  fieldMappings: FieldMappingItem[];
  createdAt: string;
  createdBy: string;
}

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
  schemaFields: SchemaField[];
  isActive: boolean;
  createdAt: string;
}

class FieldMappingService {
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

  async createBulkFieldMapping(
    request: CreateBulkFieldMappingRequest
  ): Promise<CreateBulkFieldMappingResponse> {
    const response = await fetch(`${API_BASE_URL}/api/field-mappings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ClientId: request.clientId,
        SchemaId: request.schemaId,
        FieldMappings: request.fieldMappings.map((fm) => ({
          SchemaFieldId: fm.schemaFieldId,
          InputField: fm.inputField,
          Transformation: fm.transformation || null,
        })),
      }),
    });

    return this.handleResponse<CreateBulkFieldMappingResponse>(response);
  }

  async getFieldMappings(
    clientId?: number,
    schemaId?: number
  ): Promise<CreateBulkFieldMappingResponse[]> {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId.toString());
    if (schemaId) params.append("schemaId", schemaId.toString());

    const url = `${API_BASE_URL}/api/field-mappings${params.toString() ? "?" + params.toString() : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<CreateBulkFieldMappingResponse[]>(response);
  }

  async getSchemas(): Promise<Schema[]> {
    const response = await fetch(`${API_BASE_URL}/api/schemas`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<Schema[]>(response);
  }

  async getSchemaById(schemaId: number): Promise<Schema> {
    const response = await fetch(`${API_BASE_URL}/api/schemas/${schemaId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.handleResponse<Schema>(response);
  }

  validateFieldMappings(fieldMappings: FieldMappingItem[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (fieldMappings.length === 0) {
      errors.push("At least one field mapping is required");
      return { isValid: false, errors };
    }

    fieldMappings.forEach((mapping, index) => {
      if (!mapping.inputField || mapping.inputField.trim().length === 0) {
        errors.push(`Field mapping ${index + 1}: Input field is required`);
      }

      if (mapping.inputField && mapping.inputField.length > 255) {
        errors.push(
          `Field mapping ${index + 1}: Input field must be 255 characters or less`
        );
      }

      if (!mapping.schemaFieldId || mapping.schemaFieldId <= 0) {
        errors.push(`Field mapping ${index + 1}: Schema field is required`);
      }
    });

    // Check for duplicate input fields
    const inputFields = fieldMappings
      .map((fm) => fm.inputField?.trim().toLowerCase())
      .filter(Boolean);
    const duplicates = inputFields.filter(
      (field, index) => inputFields.indexOf(field) !== index
    );
    if (duplicates.length > 0) {
      errors.push(
        `Duplicate input fields found: ${[...new Set(duplicates)].join(", ")}`
      );
    }

    // Check for duplicate schema field mappings
    const schemaFieldIds = fieldMappings
      .map((fm) => fm.schemaFieldId)
      .filter(Boolean);
    const duplicateSchemaFields = schemaFieldIds.filter(
      (fieldId, index) => schemaFieldIds.indexOf(fieldId) !== index
    );
    if (duplicateSchemaFields.length > 0) {
      errors.push(
        `Duplicate schema field mappings found for field IDs: ${[...new Set(duplicateSchemaFields)].join(", ")}`
      );
    }

    return { isValid: errors.length === 0, errors };
  }
}

export const fieldMappingService = new FieldMappingService();
