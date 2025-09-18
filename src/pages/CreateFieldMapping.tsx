import React, { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  MapPin,
  FileText,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import { projectService, type ApiProject } from "../services/projectService";
import {
  fieldMappingService,
  type CreateBulkFieldMappingRequest,
  type FieldMappingItem,
  type Schema,
} from "../services/fieldMappingService";

const CreateFieldMapping: React.FC = () => {
  // State management
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedProject, setSelectedProject] = useState<number>(0);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [fieldMappings, setFieldMappings] = useState<{ [key: number]: string }>(
    {}
  );

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Load projects and schemas on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingProjects(true);
        const [projectsData, schemasData] = await Promise.all([
          projectService.getAllProjects(),
          fieldMappingService.getSchemas(),
        ]);

        setProjects(projectsData.filter((project) => project.isActive));
        setSchemas(schemasData.filter((schema) => schema.isActive));
      } catch (error) {
        console.error("Failed to load initial data:", error);
        setSubmitError("Failed to load projects and schemas");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadInitialData();
  }, []);

  // Load schema details when schema selection changes
  useEffect(() => {
    const loadSchemaDetails = async () => {
      const selectedSchemaId = schemas.find(
        (s) => s.id === parseInt(selectedSchema?.id?.toString() || "0")
      )?.id;

      if (selectedSchemaId && selectedSchemaId > 0) {
        try {
          setIsLoadingSchemas(true);
          const schemaDetails =
            await fieldMappingService.getSchemaById(selectedSchemaId);
          setSelectedSchema(schemaDetails);

          // Reset field mappings when schema changes
          setFieldMappings({});
        } catch (error) {
          console.error("Failed to load schema details:", error);
          setSubmitError("Failed to load schema details");
        } finally {
          setIsLoadingSchemas(false);
        }
      } else {
        setSelectedSchema(null);
        setFieldMappings({});
      }
    };

    loadSchemaDetails();
  }, [selectedProject]);

  const handleProjectChange = (projectId: number) => {
    setSelectedProject(projectId);
    setSelectedSchema(null);
    setFieldMappings({});
    setValidationErrors([]);
    setSubmitError(null);
  };

  const handleSchemaChange = async (schemaId: number) => {
    if (schemaId > 0) {
      try {
        setIsLoadingSchemas(true);
        const schemaDetails = await fieldMappingService.getSchemaById(schemaId);
        setSelectedSchema(schemaDetails);
        setFieldMappings({});
      } catch (error) {
        console.error("Failed to load schema details:", error);
        setSubmitError("Failed to load schema details");
      } finally {
        setIsLoadingSchemas(false);
      }
    } else {
      setSelectedSchema(null);
      setFieldMappings({});
    }
    setValidationErrors([]);
    setSubmitError(null);
  };

  const handleInputFieldChange = (
    schemaFieldId: number,
    inputField: string
  ) => {
    setFieldMappings((prev) => ({
      ...prev,
      [schemaFieldId]: inputField,
    }));
    setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (selectedProject <= 0) {
      errors.push("Please select a project");
    }

    if (!selectedSchema || selectedSchema.id <= 0) {
      errors.push("Please select a schema");
    }

    // Check if at least one field mapping is provided
    const nonEmptyMappings = Object.entries(fieldMappings).filter(
      ([_, inputField]) => inputField.trim() !== ""
    );

    if (nonEmptyMappings.length === 0) {
      errors.push("At least one field mapping is required");
    }

    // Check for duplicate input field names
    const inputFields = nonEmptyMappings.map(([_, inputField]) =>
      inputField.trim().toLowerCase()
    );
    const duplicates = inputFields.filter(
      (item, index) => inputFields.indexOf(item) !== index
    );

    if (duplicates.length > 0) {
      errors.push("Input field names must be unique");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare field mappings for API
      const validMappings: FieldMappingItem[] = Object.entries(fieldMappings)
        .filter(([_, inputField]) => inputField.trim() !== "")
        .map(([schemaFieldId, inputField]) => ({
          schemaFieldId: parseInt(schemaFieldId),
          inputField: inputField.trim(),
        }));

      const request: CreateBulkFieldMappingRequest = {
        projectId: selectedProject,
        schemaId: selectedSchema!.id,
        fieldMappings: validMappings,
      };

      await fieldMappingService.createBulkFieldMapping(request);
      setShowSuccessModal(true);

      // Reset form after successful submission
      setTimeout(() => {
        setSelectedProject(0);
        setSelectedSchema(null);
        setFieldMappings({});
      }, 2000);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to create field mappings"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/field-mapping"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Field Mapping
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-4">
          Create Field Mappings
        </h1>
        <p className="text-muted-foreground mt-2">
          Select a project and schema, then map your input fields to the schema
          fields
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Project and Schema Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Step 1: Select Project and Schema
            </CardTitle>
            <CardDescription>
              Choose the project and schema for which you want to create field
              mappings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) =>
                    handleProjectChange(parseInt(e.target.value))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoadingProjects}
                >
                  {isLoadingProjects ? (
                    <option value={0}>Loading projects...</option>
                  ) : projects.length === 0 ? (
                    <option value={0}>No projects available</option>
                  ) : (
                    <>
                      <option value={0}>Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} ({project.code})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Schema Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Schema <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSchema?.id || 0}
                  onChange={(e) => handleSchemaChange(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={selectedProject === 0}
                >
                  <option value={0}>Select a schema</option>
                  {schemas.map((schema) => (
                    <option key={schema.id} value={schema.id}>
                      {schema.name}
                    </option>
                  ))}
                </select>
                {selectedProject === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Select a project first
                  </p>
                )}
              </div>
            </div>

            {/* Schema Info */}
            {selectedSchema && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="font-medium text-blue-900">
                  {selectedSchema.name}
                </h4>
                {selectedSchema.description && (
                  <p className="text-sm text-blue-700 mt-1">
                    {selectedSchema.description}
                  </p>
                )}
                <p className="text-sm text-blue-600 mt-2">
                  {selectedSchema.schemaFields.length} fields available for
                  mapping
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Field Mapping */}
        {selectedSchema && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Step 2: Map Input Fields to Schema Fields
              </CardTitle>
              <CardDescription>
                For each schema field below, enter the corresponding input field
                name from your data source
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSchemas ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading schema fields...
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedSchema.schemaFields
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((field) => (
                      <div
                        key={field.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          {/* Schema Field Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                {field.fieldLabel}
                                {field.isRequired && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </h4>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {field.dataType}
                              </span>
                            </div>
                            {field.format && (
                              <p className="text-sm text-gray-600 mt-1">
                                {field.format}
                              </p>
                            )}
                          </div>

                          {/* Input Field Mapping */}
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Input Field Name
                            </label>
                            <input
                              type="text"
                              value={fieldMappings[field.id] || ""}
                              onChange={(e) =>
                                handleInputFieldChange(field.id, e.target.value)
                              }
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`e.g., ${field.fieldName.toLowerCase().replace(/\s+/g, "_")}`}
                              maxLength={255}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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

              {/* Submit Error */}
              {submitError && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-red-800">Error</h4>
                      <p className="text-sm text-red-600 mt-1">{submitError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoadingSchemas}
                  className="w-full md:w-auto"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating Field Mappings...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Field Mappings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedSchema && selectedProject === 0 && (
          <Card>
            <CardContent className="text-center p-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Get Started with Field Mapping
              </h3>
              <p className="text-gray-600 mb-4">
                Select a project and schema above to begin creating field
                mappings
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Field Mappings Created Successfully"
      >
        <div className="text-center p-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Success!
          </h3>
          <p className="text-gray-600 mb-4">
            Field mappings have been created successfully for the selected
            project and schema.
          </p>
          <Button onClick={() => setShowSuccessModal(false)} className="mt-4">
            Continue
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CreateFieldMapping;
