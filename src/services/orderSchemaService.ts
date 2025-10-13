import { API_CONFIG, apiRequest } from "../config/api";

// Schema field coordinate interface for PDF highlighting
export interface FieldCoordinate {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

// Updated API response interface matching the new backend structure
export interface OrderSchemaFieldDataResponse {
  documentId: number | null;
  orderId: number;
  orderName: string;
  type: string | null;
  status: string;
  schemaFieldId: number;
  schemaName: string;
  fieldName: string;
  dataType: string;
  keyingValue: string | null;
  processedValue: string | null;
  metaDataValue: string | null;
  confidenceScore: number | null;
  isVerified: boolean;
  coordinates: string | null; // JSON string of coordinates
  pageNumber: number | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
}

// Document response interface
export interface DocumentResponse {
  id: number;
  name: string;
  type: string | null;
  url: string;
  blobName: string | null;
  searchableUrl: string | null;
  searchableBlobName: string | null;
  pages: number;
  hasSearchableText: boolean;
  fileSizeBytes: number | null;
  fileSizeFormatted: string | null;
  createdAt: string;
}

// Schema field interface from backend
export interface SchemaField {
  id: number;
  fieldName: string;
  displayName: string;
  schemaName: string; // Added for grouping
  dataType: string; // text, number, date, boolean, etc.
  isRequired: boolean;
  defaultValue?: string | null;
  keyingValue?: string | null; // Current keyed value
  coordinates?: FieldCoordinate | null; // PDF coordinates for highlighting
  validationRules?: string | null;
  description?: string | null;
  order: number; // Display order in the UI
  isVerified: boolean; // Added from API
}

// PDF document metadata
export interface DocumentMetadata {
  id: number;
  name: string;
  url: string;
  pages: number;
  type: string;
  hasSearchableText: boolean;
  searchableUrl?: string | null;
}

// Main response interface for order schema
export interface OrderSchemaResponse {
  orderId: number;
  orderIdentifier: string;
  projectName: string;
  batchName: string;
  schemaFields: SchemaField[];
  documents: DocumentMetadata[];
  primaryDocumentId?: number | null; // Main document for keying
}

class OrderSchemaService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error occurred" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    try {
      const jsonData = await response.json();
      return jsonData as T;
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      throw new Error("Invalid response format");
    }
  }

  // Fetch schema fields for an order
  async getOrderSchemaFields(
    orderId: number
  ): Promise<OrderSchemaFieldDataResponse[]> {
    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.SCHEMA_ORDER}/${orderId}`;
      console.log("Fetching order schema fields from:", endpoint);

      const response = await apiRequest(endpoint, {
        method: "GET",
      });

      const apiData =
        await this.handleResponse<OrderSchemaFieldDataResponse[]>(response);
      console.log("Raw API schema fields response:", apiData);

      return apiData;
    } catch (error) {
      console.error("Error fetching order schema fields:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch order schema fields");
    }
  }

  // Fetch documents for an order
  async getOrderDocuments(orderId: number): Promise<DocumentResponse[]> {
    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.ORDERS}/${orderId}/documents`;
      console.log("Fetching order documents from:", endpoint);

      const response = await apiRequest(endpoint, {
        method: "GET",
      });

      const documents = await this.handleResponse<DocumentResponse[]>(response);
      console.log("Raw API documents response:", documents);

      return documents;
    } catch (error) {
      console.error("Error fetching order documents:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch order documents");
    }
  }

  // Fetch combined schema and documents for an order
  async getOrderSchema(orderId: number): Promise<OrderSchemaResponse> {
    try {
      // Fetch both schema fields and documents in parallel
      const [schemaFields, documents] = await Promise.all([
        this.getOrderSchemaFields(orderId),
        this.getOrderDocuments(orderId),
      ]);

      // Transform to expected format
      const transformedData = this.transformCombinedResponse(
        schemaFields,
        documents,
        orderId
      );
      console.log("Combined transformed schema data:", transformedData);

      return transformedData;
    } catch (error) {
      console.error("Error fetching order schema:", error);

      // If API is not available, return mock data for development
      if (
        error instanceof Error &&
        (error.message.includes("404") || error.message.includes("Network"))
      ) {
        console.warn(
          "API endpoint not available, returning mock data for development"
        );
        return this.getMockOrderSchema(orderId);
      }

      throw error instanceof Error
        ? error
        : new Error("Failed to fetch order schema");
    }
  }

  // Transform combined API responses to expected format
  private transformCombinedResponse(
    apiFields: OrderSchemaFieldDataResponse[],
    apiDocuments: DocumentResponse[],
    orderId: number
  ): OrderSchemaResponse {
    if (!Array.isArray(apiFields) || apiFields.length === 0) {
      console.warn("No fields received from API, using fallback");
      return this.getMockOrderSchema(orderId);
    }

    const firstField = apiFields[0];
    const orderName = firstField?.orderName || `ORDER-${orderId}`;

    // Transform fields
    const schemaFields: SchemaField[] = apiFields.map((apiField, index) => {
      // Parse coordinates if available
      let coordinates: FieldCoordinate | null = null;
      if (apiField.coordinates) {
        try {
          coordinates = JSON.parse(apiField.coordinates);
        } catch (e) {
          console.warn("Failed to parse coordinates:", apiField.coordinates);
        }
      }

      // Create display name from field name
      const displayName = this.formatFieldName(apiField.fieldName);

      return {
        id: apiField.schemaFieldId,
        fieldName: apiField.fieldName,
        displayName: displayName,
        schemaName: apiField.schemaName,
        dataType: apiField.dataType,
        isRequired: false, // Default to false since not provided by API
        defaultValue: null,
        keyingValue: apiField.keyingValue,
        coordinates: coordinates,
        validationRules: null,
        description: `Field for ${displayName}`,
        order: index + 1,
        isVerified: apiField.isVerified,
      };
    });

    // Transform documents
    const documents: DocumentMetadata[] = apiDocuments.map((doc) => ({
      id: doc.id,
      name: doc.name,
      url: doc.url,
      pages: doc.pages,
      type: doc.type || "application/pdf",
      hasSearchableText: doc.hasSearchableText,
      searchableUrl: doc.searchableUrl,
    }));

    // Use fallback document if none provided
    const finalDocuments =
      documents.length > 0
        ? documents
        : [
            {
              id: 1,
              name: `${orderName} - Document.pdf`,
              url: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf", // Demo PDF
              pages: 14,
              type: "application/pdf",
              hasSearchableText: true,
              searchableUrl: null,
            },
          ];

    return {
      orderId: orderId,
      orderIdentifier: orderName,
      projectName: "Current Project", // Would need separate API call to get this
      batchName: "Current Batch", // Would need separate API call to get this
      schemaFields: schemaFields,
      documents: finalDocuments,
      primaryDocumentId: finalDocuments[0]?.id || null,
    };
  }

  // Helper to format field names for display
  private formatFieldName(fieldName: string): string {
    return fieldName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // Mock data for development when API is not available
  private getMockOrderSchema(orderId: number): OrderSchemaResponse {
    return {
      orderId: orderId,
      orderIdentifier: `ORD-${orderId.toString().padStart(6, "0")}`,
      projectName: "Sample Project",
      batchName: "Sample Batch",
      schemaFields: [
        {
          id: 1,
          fieldName: "customerName",
          displayName: "Customer Name",
          schemaName: "Customer Information",
          dataType: "text",
          isRequired: true,
          defaultValue: null,
          keyingValue: null,
          coordinates: {
            x: 100,
            y: 200,
            width: 200,
            height: 20,
            page: 1,
          },
          validationRules: "Required field",
          description: "Full name of the customer",
          order: 1,
          isVerified: false,
        },
        {
          id: 2,
          fieldName: "amount",
          displayName: "Loan Amount",
          schemaName: "Loan Details",
          dataType: "number",
          isRequired: true,
          defaultValue: null,
          keyingValue: null,
          coordinates: {
            x: 150,
            y: 300,
            width: 100,
            height: 20,
            page: 1,
          },
          validationRules: "Must be a positive number",
          description: "Total loan amount in dollars",
          order: 2,
          isVerified: false,
        },
        {
          id: 3,
          fieldName: "dateOfBirth",
          displayName: "Date of Birth",
          schemaName: "Customer Information",
          dataType: "date",
          isRequired: false,
          defaultValue: null,
          keyingValue: null,
          coordinates: null,
          validationRules: "Valid date format",
          description: "Customer's date of birth",
          order: 3,
          isVerified: false,
        },
        {
          id: 4,
          fieldName: "notes",
          displayName: "Additional Notes",
          schemaName: "Additional Information",
          dataType: "text",
          isRequired: false,
          defaultValue: null,
          keyingValue: null,
          coordinates: null,
          validationRules: null,
          description: "Any additional notes or comments (multiline)",
          order: 4,
          isVerified: false,
        },
      ],
      documents: [
        {
          id: 1,
          name: "Sample Document.pdf",
          url: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
          pages: 14,
          type: "application/pdf",
          hasSearchableText: true,
          searchableUrl: null,
        },
      ],
      primaryDocumentId: 1,
    };
  }

  // Update keying values for schema fields (future implementation)
  async updateKeyingValues(
    orderId: number,
    fieldValues: { fieldId: number; value: string }[]
  ): Promise<void> {
    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.SCHEMA_ORDER}/${orderId}/keying`;
      const response = await apiRequest(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fieldValues }),
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error("Error updating keying values:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to update keying values");
    }
  }

  // Save keying progress (future implementation)
  async saveKeyingProgress(
    orderId: number,
    fieldValues: { fieldId: number; value: string }[]
  ): Promise<void> {
    try {
      const endpoint = `${API_CONFIG.ENDPOINTS.SCHEMA_ORDER}/${orderId}/save-progress`;
      const response = await apiRequest(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fieldValues }),
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving keying progress:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to save keying progress");
    }
  }
}

// Export singleton instance
export const orderSchemaService = new OrderSchemaService();

export default orderSchemaService;
