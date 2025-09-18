import {
  API_CONFIG,
  buildApiUrl,
  getAuthHeaders,
  apiRequest,
} from "../config/api";

export interface CreateBatchRequest {
  fileName: string;
  projectId: number;
  name: string;
  description?: string;
  metadataFile: File;
  documents?: FileList | File[];
}

export interface CreateBatchResponse {
  id: string;
  name: string;
  fileName: string;
  projectId: number;
  description?: string;
  status: string;
  createdAt: string;
  documentCount: number;
}

export interface BatchListResponse {
  id: number;
  name: string;
  fileName: string;
  projectName: string;
  status: string;
  totalOrders: number;
  processedOrders: number;
  validOrders: number;
  invalidOrders: number;
  createdAt: string;
  createdByName: string;
}

export interface BatchValidationError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  errors?: BatchValidationError[];
}

class BatchService {
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

  async createBatch(request: CreateBatchRequest): Promise<CreateBatchResponse> {
    const formData = new FormData();

    // Add required fields
    formData.append("FileName", request.fileName);
    formData.append("ProjectId", request.projectId.toString());
    formData.append("Name", request.name);
    formData.append("MetadataFile", request.metadataFile);

    // Add optional description
    if (request.description) {
      formData.append("Description", request.description);
    }

    // Add documents if provided
    if (request.documents) {
      const docs = Array.isArray(request.documents)
        ? request.documents
        : Array.from(request.documents);
      docs.forEach((file) => {
        formData.append(`Documents`, file);
      });
    }

    const url = buildApiUrl(API_CONFIG.ENDPOINTS.BATCHES);
    const authHeaders = getAuthHeaders();

    // Create headers without Content-Type for multipart/form-data
    const headers: Record<string, string> = {};
    if (authHeaders["Authorization"]) {
      headers["Authorization"] = authHeaders["Authorization"] as string;
    }

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers,
    });

    return this.handleResponse<CreateBatchResponse>(response);
  }

  async getAllBatches(): Promise<BatchListResponse[]> {
    const response = await apiRequest(API_CONFIG.ENDPOINTS.BATCHES, {
      method: "GET",
    });

    return this.handleResponse<BatchListResponse[]>(response);
  }

  async getBatchById(batchId: number): Promise<BatchListResponse> {
    const response = await apiRequest(
      `${API_CONFIG.ENDPOINTS.BATCHES}/${batchId}`,
      {
        method: "GET",
      }
    );

    return this.handleResponse<BatchListResponse>(response);
  }

  async validateMetadataFile(
    file: File
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    // Project-side validation for CSV/Excel file
    const errors: string[] = [];

    if (!file) {
      errors.push("Metadata file is required");
      return { isValid: false, errors };
    }

    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(
        "Metadata file must be a CSV or Excel file (.csv, .xlsx, .xls)"
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      errors.push("Metadata file size must be less than 10MB");
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async validateDocuments(
    files: FileList | File[]
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const docs = Array.isArray(files) ? files : Array.from(files);

    if (docs.length === 0) {
      return { isValid: true }; // Documents are optional
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
    ];
    const maxFileSize = 50 * 1024 * 1024; // 50MB per file
    const maxTotalFiles = 1000;

    if (docs.length > maxTotalFiles) {
      errors.push(`Too many files. Maximum ${maxTotalFiles} files allowed`);
    }

    docs.forEach((file, index) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(
          `File ${index + 1} (${file.name}): Only PDF, JPEG, PNG, and TIFF files are allowed`
        );
      }

      if (file.size > maxFileSize) {
        errors.push(
          `File ${index + 1} (${file.name}): File size must be less than 50MB`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const batchService = new BatchService();
