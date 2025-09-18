import { API_CONFIG, apiRequest } from "../config/api";

export interface FieldMappingItem {
  schemaFieldId: number;
  inputField: string;
  transformation?: string;
}

export interface CreateBulkFieldMappingRequest {
  projectId: number;
  schemaId: number;
  fieldMappings: FieldMappingItem[];
}

export interface CreateBulkFieldMappingResponse {
  id: number;
  projectId: number;
  schemaId: number;
  fieldMappings: FieldMappingItem[];
  createdAt: string;
  createdBy: string;
}

// Interface for the actual API response from GET /field-mappings
export interface FieldMappingResponse {
  id: number;
  projectId: number;
  schemaId: number;
  schemaFieldId: number;
  inputField: string;
  transformation: string | null;
  createdAt: string;
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
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.title) {
          errorMessage = errorData.title;
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
      } catch (jsonError) {
        console.warn("Could not parse error response as JSON:", jsonError);
      }

      throw new Error(errorMessage);
    }
    return response.json();
  }

  async createBulkFieldMapping(
    request: CreateBulkFieldMappingRequest
  ): Promise<CreateBulkFieldMappingResponse> {
    const payload = {
      ProjectId: request.projectId,
      SchemaId: request.schemaId,
      FieldMappings: request.fieldMappings.map((fm) => ({
        SchemaFieldId: fm.schemaFieldId,
        InputField: fm.inputField,
        Transformation: fm.transformation || null,
      })),
    };

    console.log("Creating bulk field mapping with payload:", payload);

    const response = await apiRequest(API_CONFIG.ENDPOINTS.FIELD_MAPPINGS, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status, response.statusText);
    return this.handleResponse<CreateBulkFieldMappingResponse>(response);
  }

  async getFieldMappings(
    projectId?: number,
    schemaId?: number
  ): Promise<FieldMappingResponse[]> {
    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId.toString());
    if (schemaId) params.append("schemaId", schemaId.toString());

    const endpoint = `${API_CONFIG.ENDPOINTS.FIELD_MAPPINGS}${params.toString() ? "?" + params.toString() : ""}`;

    console.log("Fetching field mappings from:", endpoint);

    const response = await apiRequest(endpoint, {
      method: "GET",
    });

    console.log(
      "Field mappings response status:",
      response.status,
      response.statusText
    );
    return this.handleResponse<FieldMappingResponse[]>(response);
  }

  async getSchemas(): Promise<Schema[]> {
    const response = await apiRequest(API_CONFIG.ENDPOINTS.SCHEMAS, {
      method: "GET",
    });

    return this.handleResponse<Schema[]>(response);
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
