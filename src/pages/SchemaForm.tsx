import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import {
  schemaService,
  type UpdateSchemaRequest,
  type CreateSchemaRequest,
  type Schema,
  DATA_TYPES,
  type DataType,
} from "../services/schemaService";
import { useFormValidation } from "../hooks/useFormValidation";

// Helper function to normalize data types
const normalizeDataType = (dataType: string): DataType => {
  const normalized = dataType.toLowerCase().trim();
  const found = DATA_TYPES.find((type) => type.toLowerCase() === normalized);
  return found || "string"; // Default to 'string' if not found
};

interface SchemaField {
  id?: number; // Optional for new fields
  tempId: string; // For tracking fields
  fieldName: string;
  fieldLabel: string;
  dataType: DataType;
  format: string;
  isRequired: boolean;
  displayOrder: number;
  isDeleted: boolean;
  isNew: boolean;
  isCollapsed: boolean;
  minLength?: number;
  maxLength?: number;
  precision?: number;
}

interface SchemaFormProps {
  isGlobal?: boolean;
}

const SchemaForm: React.FC<SchemaFormProps> = ({ isGlobal = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const schemaId = id ? parseInt(id) : null;
  const isEditMode = schemaId !== null;
  const isCreateMode = !isEditMode;

  const [originalSchema, setOriginalSchema] = useState<Schema | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState<{
    title: string;
    message: string;
    details?: string[];
  } | null>(null);

  // Form validation with centralized notifications
  const formValidation = useFormValidation({
    fieldMapping: {
      Schema: "name",
      Name: "name",
      Description: "description",
      SchemaFields: "fields",
    },
  });

  useEffect(() => {
    if (isEditMode && schemaId && schemaId > 0) {
      loadSchema();
    }
  }, [schemaId, isEditMode]);

  const loadSchema = async () => {
    if (!schemaId) return;

    try {
      setIsLoading(true);
      const schemaResponse = isGlobal
        ? await schemaService.getGlobalSchemaById(schemaId)
        : await schemaService.getSchemaById(schemaId);

      // Handle API response format
      if (!schemaResponse.success || !schemaResponse.data) {
        formValidation.handleFormApiError(schemaResponse);
        return;
      }

      const schema = schemaResponse.data;
      setOriginalSchema(schema);

      setFormData({
        name: schema.name,
        description: schema.description || "",
        isActive: schema.isActive,
      });

      // Convert schema fields to editable format
      const editableFields: SchemaField[] = schema.schemaFields.map((field) => {
        // Normalize data type to ensure it matches our expected values
        const validDataType = normalizeDataType(field.dataType);

        return {
          id: field.id,
          tempId: `existing_${field.id}`,
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          dataType: validDataType,
          format: field.format || "",
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
          isDeleted: false,
          isNew: false,
          isCollapsed: false, // Start expanded
        };
      });

      setSchemaFields(editableFields);
    } catch (error) {
      console.error("Failed to load schema:", error);
      // Error handled by loading state"
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new field at the end
  const addSchemaField = () => {
    insertSchemaField(schemaFields.filter((f) => !f.isDeleted).length - 1);
  };

  // Insert a new field after a given index (active fields only)
  const insertSchemaField = (afterIndex: number) => {
    const activeFields = schemaFields.filter((f) => !f.isDeleted);
    const insertAt = afterIndex + 1;
    const maxOrder = Math.max(0, ...activeFields.map((f) => f.displayOrder));
    const newField: SchemaField = {
      tempId: `new_${Date.now()}_${Math.random()}`,
      fieldName: "",
      fieldLabel: "",
      dataType: "string",
      format: "",
      isRequired: false,
      displayOrder: maxOrder + 1,
      isDeleted: false,
      isNew: true,
      isCollapsed: false,
    };
    // Insert new field into the correct position in the full schemaFields array
    let newFields: SchemaField[] = [];
    let activeIdx = 0;
    for (let i = 0; i < schemaFields.length; i++) {
      newFields.push(schemaFields[i]);
      if (!schemaFields[i].isDeleted && activeIdx === afterIndex) {
        newFields.push(newField);
      }
      if (!schemaFields[i].isDeleted) activeIdx++;
    }
    // If inserting at the end
    if (insertAt >= activeFields.length) {
      newFields.push(newField);
    }
    setSchemaFields(newFields);
    setTimeout(reorderFields, 0);
  };

  const removeSchemaField = (tempId: string) => {
    const field = schemaFields.find((f) => f.tempId === tempId);
    if (!field) return;

    if (field.isNew) {
      // Remove new fields completely
      setSchemaFields((prev) => prev.filter((f) => f.tempId !== tempId));
    } else {
      // Mark existing fields as deleted (only in edit mode)
      setSchemaFields((prev) =>
        prev.map((f) => (f.tempId === tempId ? { ...f, isDeleted: true } : f))
      );
    }

    // Reorder remaining fields
    reorderFields();
  };

  const restoreSchemaField = (tempId: string) => {
    setSchemaFields((prev) =>
      prev.map((f) => (f.tempId === tempId ? { ...f, isDeleted: false } : f))
    );
    reorderFields();
  };

  const reorderFields = () => {
    setSchemaFields((prev) => {
      const activeFields = prev.filter((f) => !f.isDeleted);
      const deletedFields = prev.filter((f) => f.isDeleted);

      const reorderedActive = activeFields.map((field, index) => ({
        ...field,
        displayOrder: index + 1,
      }));

      return [...reorderedActive, ...deletedFields];
    });
  };

  const toggleFieldCollapse = (tempId: string) => {
    setSchemaFields((prev) =>
      prev.map((field) =>
        field.tempId === tempId
          ? { ...field, isCollapsed: !field.isCollapsed }
          : field
      )
    );
  };

  const updateSchemaField = (tempId: string, updates: Partial<SchemaField>) => {
    setSchemaFields((prev) =>
      prev.map((field) =>
        field.tempId === tempId ? { ...field, ...updates } : field
      )
    );
    setValidationErrors([]);
  };

  const moveFieldUp = (tempId: string) => {
    const activeFields = schemaFields.filter((f) => !f.isDeleted);
    const currentIndex = activeFields.findIndex((f) => f.tempId === tempId);

    if (currentIndex > 0) {
      const newActiveFields = [...activeFields];
      [newActiveFields[currentIndex - 1], newActiveFields[currentIndex]] = [
        newActiveFields[currentIndex],
        newActiveFields[currentIndex - 1],
      ];

      const reorderedActive = newActiveFields.map((field, index) => ({
        ...field,
        displayOrder: index + 1,
      }));

      const deletedFields = schemaFields.filter((f) => f.isDeleted);
      setSchemaFields([...reorderedActive, ...deletedFields]);
    }
  };

  const moveFieldDown = (tempId: string) => {
    const activeFields = schemaFields.filter((f) => !f.isDeleted);
    const currentIndex = activeFields.findIndex((f) => f.tempId === tempId);

    if (currentIndex < activeFields.length - 1) {
      const newActiveFields = [...activeFields];
      [newActiveFields[currentIndex], newActiveFields[currentIndex + 1]] = [
        newActiveFields[currentIndex + 1],
        newActiveFields[currentIndex],
      ];

      const reorderedActive = newActiveFields.map((field, index) => ({
        ...field,
        displayOrder: index + 1,
      }));

      const deletedFields = schemaFields.filter((f) => f.isDeleted);
      setSchemaFields([...reorderedActive, ...deletedFields]);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    formValidation.clearAllErrors();
  };

  const validateForm = (): boolean => {
    if (isCreateMode) {
      const createRequest: CreateSchemaRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        schemaFields: schemaFields.map((field) => ({
          fieldName: field.fieldName.trim(),
          fieldLabel: field.fieldLabel.trim(),
          dataType: field.dataType,
          format: field.format.trim() || undefined,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
        })),
      };

      const validation = schemaService.validateSchema(createRequest);
      setValidationErrors(validation.errors);
      return validation.isValid;
    } else {
      const updateRequest: UpdateSchemaRequest = {
        id: schemaId!,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        schemaFields: schemaFields.map((field) => ({
          id: field.id,
          fieldName: field.fieldName.trim(),
          fieldLabel: field.fieldLabel.trim(),
          dataType: field.dataType,
          format: field.format.trim() || undefined,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
          isDeleted: field.isDeleted,
        })),
      };

      const validation = schemaService.validateSchema(updateRequest);
      setValidationErrors(validation.errors);
      return validation.isValid;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isCreateMode) {
        const request: CreateSchemaRequest = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          schemaFields: schemaFields.map((field) => ({
            fieldName: field.fieldName.trim(),
            fieldLabel: field.fieldLabel.trim(),
            dataType: field.dataType,
            format: field.format.trim() || undefined,
            isRequired: field.isRequired,
            displayOrder: field.displayOrder,
          })),
        };

        const response = await (isGlobal
          ? schemaService.createGlobalSchema(request)
          : schemaService.createSchema(request));

        if (!response.success) {
          // Show error modal for API response errors
          const errorDetails: string[] = [];
          if (
            response.validationErrors &&
            Array.isArray(response.validationErrors)
          ) {
            errorDetails.push(
              ...response.validationErrors.map((ve: any) => ve.errorMessage)
            );
          }

          setErrorModalContent({
            title: `Failed to ${isCreateMode ? "Create" : "Update"} Schema`,
            message:
              response.message ||
              "An error occurred while processing your request.",
            details: errorDetails.length > 0 ? errorDetails : undefined,
          });
          setShowErrorModal(true);
          return;
        }
      } else {
        const request: UpdateSchemaRequest = {
          id: schemaId!,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
          schemaFields: schemaFields.map((field) => ({
            id: field.id,
            fieldName: field.fieldName.trim(),
            fieldLabel: field.fieldLabel.trim(),
            dataType: field.dataType,
            format: field.format.trim() || undefined,
            isRequired: field.isRequired,
            displayOrder: field.displayOrder,
            isDeleted: field.isDeleted,
          })),
        };

        const response = await (isGlobal
          ? schemaService.updateGlobalSchema(request)
          : schemaService.updateSchema(request));

        if (!response.success) {
          // Show error modal for API response errors
          const errorDetails: string[] = [];
          if (
            response.validationErrors &&
            Array.isArray(response.validationErrors)
          ) {
            errorDetails.push(
              ...response.validationErrors.map((ve: any) => ve.errorMessage)
            );
          }

          setErrorModalContent({
            title: `Failed to ${isCreateMode ? "Create" : "Update"} Schema`,
            message:
              response.message ||
              "An error occurred while processing your request.",
            details: errorDetails.length > 0 ? errorDetails : undefined,
          });
          setShowErrorModal(true);
          return;
        }
      }

      // Show success modal
      setShowSuccessModal(true);

      // Redirect after a brief delay
      setTimeout(() => {
        navigate(isGlobal ? "/global-schemas" : "/schemas");
      }, 2000);
    } catch (error) {
      console.error(
        `Failed to ${isCreateMode ? "create" : "update"} schema:`,
        error
      );

      // Clear previous errors
      formValidation.clearAllErrors();

      // Prepare error modal content
      let errorTitle = `Failed to ${isCreateMode ? "Create" : "Update"} Schema`;
      let errorMessage = "An unexpected error occurred. Please try again.";
      let errorDetails: string[] = [];

      if (error && typeof error === "object" && "validationErrors" in error) {
        const apiError = error as any;
        errorMessage = apiError.message || errorMessage;

        // Collect validation error details
        if (
          apiError.validationErrors &&
          Array.isArray(apiError.validationErrors)
        ) {
          errorDetails = apiError.validationErrors.map(
            (ve: any) => ve.errorMessage
          );
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Show error modal instead of inline error
      setErrorModalContent({
        title: errorTitle,
        message: errorMessage,
        details: errorDetails.length > 0 ? errorDetails : undefined,
      });
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading schema...
        </div>
      </div>
    );
  }

  if (isEditMode && !originalSchema) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Schema not found
          </h3>
          <p className="text-gray-600 mb-4">
            The schema you're looking for doesn't exist.
          </p>
          <Link to={isGlobal ? "/global-schemas" : "/schemas"}>
            <Button>
              Back to {isGlobal ? "Global " : ""}Schema Management
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeFields = schemaFields.filter((f) => !f.isDeleted);
  const deletedFields = schemaFields.filter((f) => f.isDeleted);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Link
            to={isGlobal ? "/global-schemas" : "/schemas"}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {isGlobal ? "Global " : ""}Schema Management
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-4">
          {isCreateMode
            ? `Create New ${isGlobal ? "Global " : ""}Schema`
            : `Edit ${isGlobal ? "Global " : ""}Schema: ${originalSchema?.name}`}
          {!isCreateMode && originalSchema?.version && (
            <span className="inline-flex items-center gap-1 text-lg font-normal text-gray-500 ml-3">
              <Database className="h-4 w-4" />
              Version {originalSchema.version}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isCreateMode
            ? `Define a new ${isGlobal ? "global " : ""}schema with fields and validation rules`
            : `Modify ${isGlobal ? "global " : ""}schema details and manage fields`}
        </p>
      </div>

      <div className="space-y-6">
        {/* Schema Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Schema Information</CardTitle>
            <CardDescription>Basic details about the schema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Schema Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  handleInputChange("name", e.target.value);
                  // Clear validation error when user types
                  if (formValidation.hasError("name")) {
                    formValidation.clearFieldError("name");
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Invoice Schema, Customer Data Schema"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  handleInputChange("description", e.target.value);
                  // Clear validation error when user types
                  if (formValidation.hasError("description")) {
                    formValidation.clearFieldError("description");
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this schema is used for..."
                rows={3}
                maxLength={500}
              />

              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {isEditMode && (
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      handleInputChange("isActive", e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium">Schema is active</span>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schema Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Schema Fields ({activeFields.length})</span>
            </CardTitle>
            <CardDescription>
              {isCreateMode
                ? "Define the fields that will be part of this schema"
                : "Manage the fields that are part of this schema"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeFields.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {isEditMode ? "active " : ""}fields
                </h3>
                <p className="text-gray-600 mb-4">
                  Add fields to define the structure of your schema
                </p>
                <Button onClick={addSchemaField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {activeFields.map((field, index) => (
                  <div
                    key={field.tempId}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Header Section */}
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Drag Handle */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveFieldUp(field.tempId)}
                              disabled={index === 0}
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <GripVertical className="h-3 w-3 text-gray-400" />
                            <button
                              onClick={() => moveFieldDown(field.tempId)}
                              disabled={index === activeFields.length - 1}
                              className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                              title="Move down"
                            >
                              ↓
                            </button>
                          </div>

                          {/* Field Info */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              #{field.displayOrder}
                            </span>
                            <h3 className="text-sm font-medium text-gray-900">
                              {field.fieldLabel ||
                                field.fieldName ||
                                `Field ${field.displayOrder}`}
                            </h3>
                            {field.isRequired && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                Required
                              </span>
                            )}
                            {field.isNew && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Add Field Button */}
                          <Button
                            onClick={() => insertSchemaField(index)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-7 w-7 p-0"
                            title="Add field after this"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {/* Collapse Toggle Button */}
                          <Button
                            onClick={() => toggleFieldCollapse(field.tempId)}
                            variant="outline"
                            size="sm"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 h-7 w-7 p-0"
                            title={field.isCollapsed ? "Expand" : "Collapse"}
                          >
                            {field.isCollapsed ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )}
                          </Button>
                          {/* Remove Button */}
                          <Button
                            onClick={() => removeSchemaField(field.tempId)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-7 w-7 p-0"
                            title="Delete field"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields Section */}
                    {!field.isCollapsed && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            {/* Field Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Field Name{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={field.fieldName}
                                onChange={(e) =>
                                  updateSchemaField(field.tempId, {
                                    fieldName: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="e.g., customer_name"
                                maxLength={100}
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Technical field identifier (no spaces, lowercase
                                recommended)
                              </p>
                            </div>

                            {/* Field Label */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Field Label{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={field.fieldLabel}
                                onChange={(e) =>
                                  updateSchemaField(field.tempId, {
                                    fieldLabel: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="e.g., Customer Name"
                                maxLength={255}
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Display label shown to users
                              </p>
                            </div>

                            {/* Format */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Format{" "}
                                <span className="text-gray-400">
                                  (Optional)
                                </span>
                              </label>
                              <input
                                type="text"
                                value={field.format}
                                onChange={(e) =>
                                  updateSchemaField(field.tempId, {
                                    format: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                placeholder="e.g., dd/MM/yyyy, ###-##-####"
                                maxLength={100}
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Expected format pattern for validation
                              </p>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            {/* Data Type */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Type{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={field.dataType}
                                onChange={(e) =>
                                  updateSchemaField(field.tempId, {
                                    dataType: e.target.value as DataType,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                              >
                                {DATA_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {schemaService.getDataTypeDisplayName(type)}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-1 text-xs text-gray-500">
                                Data type for validation and processing
                              </p>
                            </div>

                            {/* MinLength, MaxLength, Precision Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* MinLength */}
                              <div className="flex flex-col">
                                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                                  MinLength
                                  <span
                                    className="text-gray-400 cursor-help"
                                    title="Minimum number of characters allowed for this field."
                                  >
                                    ?
                                  </span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={field.minLength ?? ""}
                                  onChange={(e) =>
                                    updateSchemaField(field.tempId, {
                                      minLength: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                  placeholder="Min"
                                />
                              </div>
                              {/* MaxLength */}
                              <div className="flex flex-col">
                                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                                  MaxLength
                                  <span
                                    className="text-gray-400 cursor-help"
                                    title="Maximum number of characters allowed for this field."
                                  >
                                    ?
                                  </span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={field.maxLength ?? ""}
                                  onChange={(e) =>
                                    updateSchemaField(field.tempId, {
                                      maxLength: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                  placeholder="Max"
                                />
                              </div>
                              {/* Precision */}
                              <div className="flex flex-col">
                                <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
                                  Precision
                                  <span
                                    className="text-gray-400 cursor-help"
                                    title="Number of decimal places allowed for numeric fields."
                                  >
                                    ?
                                  </span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={field.precision ?? ""}
                                  onChange={(e) =>
                                    updateSchemaField(field.tempId, {
                                      precision: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                  placeholder="Precision"
                                />
                              </div>
                            </div>

                            {/* Settings */}
                            <div className="space-y-4 mt-4">
                              <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
                                Field Settings
                              </h4>

                              {/* Required */}
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={field.isRequired}
                                  onChange={(e) =>
                                    updateSchemaField(field.tempId, {
                                      isRequired: e.target.checked,
                                    })
                                  }
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                                />
                                <div className="flex-1">
                                  <label className="text-sm font-medium text-gray-700">
                                    Required Field
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    This field must be provided
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Display Order Info */}
                            <div className="bg-gray-50 rounded-md p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">
                                  Display Order
                                </span>
                                <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  #{field.displayOrder}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Use the arrow buttons above to reorder fields
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Deleted Fields (only in edit mode) */}
            {isEditMode && deletedFields.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  Deleted Fields ({deletedFields.length})
                </h4>
                <div className="space-y-2">
                  {deletedFields.map((field) => (
                    <div
                      key={field.tempId}
                      className="border border-red-200 bg-red-50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-red-900">
                            {field.fieldName}
                          </span>
                          <span className="ml-2 text-sm text-red-600">
                            (
                            {schemaService.getDataTypeDisplayName(
                              field.dataType
                            )}
                            )
                          </span>
                        </div>
                        <Button
                          onClick={() => restoreSchemaField(field.tempId)}
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">
                      Please fix the following errors:
                    </h4>
                    <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Error messages are now shown in modal */}

            {/* Submit Button */}
            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full md:w-auto"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {isCreateMode ? "Creating Schema..." : "Updating Schema..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isCreateMode
                      ? `Create ${isGlobal ? "Global " : ""}Schema`
                      : `Update ${isGlobal ? "Global " : ""}Schema`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={`Schema ${isCreateMode ? "Created" : "Updated"} Successfully`}
      >
        <div className="text-center p-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Success!
          </h3>
          <p className="text-gray-600 mb-4">
            The schema "{formData.name}" has been{" "}
            {isCreateMode ? "created" : "updated"} successfully.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to {isGlobal ? "global " : ""}schema management...
          </p>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorModalContent(null);
        }}
        title={errorModalContent?.title || "Error"}
      >
        <div className="text-center p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{errorModalContent?.message}</p>
          {errorModalContent?.details &&
            errorModalContent.details.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 text-left">
                <h4 className="font-medium text-red-800 mb-2">Details:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {errorModalContent.details.map((detail, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-1 h-1 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          <Button
            onClick={() => {
              setShowErrorModal(false);
              setErrorModalContent(null);
            }}
            className="mt-4"
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SchemaForm;
