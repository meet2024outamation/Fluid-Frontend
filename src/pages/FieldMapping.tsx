import React, { useState, useEffect } from "react";
import {
  Check,
  RefreshCw,
  AlertCircle,
  Database,
  Users,
  CheckCircle,
} from "lucide-react";
import { Navigate } from "react-router-dom";
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
import { schemaService, type Schema } from "../services/schemaService";
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import {
  fieldMappingService,
  type FieldMappingItem,
  type CreateBulkFieldMappingRequest,
  type FieldMappingResponse,
} from "../services/fieldMappingService";

const FieldMappingPage: React.FC = () => {
  const { isTenantAdmin, needsTenantSelection, needsProjectSelection } =
    useTenantSelection();

  // Redirect tenant admin users to tenant selection if they haven't selected a tenant
  if (isTenantAdmin && needsTenantSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // Redirect if project selection is needed
  if (needsProjectSelection) {
    return <Navigate to="/project-selection" replace />;
  }

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(
    null
  );
  const [projectSchemasWithFields, setProjectSchemasWithFields] = useState<
    Schema[]
  >([]);
  const [fieldMappings, setFieldMappings] = useState<{ [key: string]: string }>(
    {}
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load only projects initially
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load data from backend"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectSchemas = async (project: ApiProject) => {
    try {
      setIsLoadingSchemas(true);
      setError(null);

      // Load schemas assigned to this project
      const assignedSchemasResponse = await schemaService.getSchemasByClientId(
        project.id
      );

      if (!assignedSchemasResponse.success || !assignedSchemasResponse.data) {
        setError("Failed to load project schemas");
        return;
      }

      const assignedSchemas = assignedSchemasResponse.data;

      // Load full schema details with fields for each assigned schema
      const schemaResponses = await Promise.all(
        assignedSchemas.map((schema) => schemaService.getSchemaById(schema.id))
      );

      // Extract successful schema data
      const schemasWithFields: Schema[] = schemaResponses
        .filter((response) => response.success && response.data)
        .map((response) => response.data!);

      setProjectSchemasWithFields(schemasWithFields);

      // Load existing field mappings for this project (with error handling)
      let existingMappings: FieldMappingResponse[] = [];
      try {
        existingMappings = await fieldMappingService.getFieldMappings(
          project.id
        );
        // Loaded existing mappings successfully
      } catch (error) {
        console.warn("Could not load existing field mappings:", error);
        // Continue without existing mappings - this is not a critical error
      }

      // Initialize field mappings object
      const initialMappings: { [key: string]: string } = {};
      schemasWithFields.forEach((schema: Schema) => {
        schema.schemaFields.forEach((field) => {
          const key = `${schema.id}_${field.id}`;

          // Check if there's an existing mapping for this field
          const existingMapping = existingMappings.find(
            (mapping) =>
              mapping.schemaId === schema.id &&
              mapping.schemaFieldId === field.id
          );

          initialMappings[key] = existingMapping?.inputField || "";
        });
      });
      setFieldMappings(initialMappings);
    } catch (error) {
      console.error("Failed to load project schemas:", error);
      setError("Failed to load schemas for this project");
    } finally {
      setIsLoadingSchemas(false);
    }
  };

  const handleProjectSelect = (project: ApiProject) => {
    setSelectedProject(project);
    loadProjectSchemas(project);
  };

  const handleFieldMappingChange = (
    schemaId: number,
    fieldId: number,
    value: string
  ) => {
    const key = `${schemaId}_${fieldId}`;
    setFieldMappings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveMappings = async () => {
    if (!selectedProject) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      // Build mapping collection including schemas with zero mappings
      const mappingsBySchema: { [schemaId: number]: FieldMappingItem[] } = {};

      Object.entries(fieldMappings).forEach(([key, value]) => {
        const [schemaId, fieldId] = key.split("_").map(Number);
        if (!mappingsBySchema[schemaId]) {
          mappingsBySchema[schemaId] = [];
        }
        if (value.trim()) {
          mappingsBySchema[schemaId].push({
            schemaFieldId: fieldId,
            inputField: value.trim(),
          });
        }
      });

      // Ensure every loaded schema appears, even if user cleared all mappings
      projectSchemasWithFields.forEach((schema) => {
        if (!mappingsBySchema[schema.id]) {
          mappingsBySchema[schema.id] = []; // explicit empty list
        }
      });

      // Prepare promises: send a call per schema (including empty arrays)
      const savePromises = Object.entries(mappingsBySchema).map(
        ([schemaId, schemaFieldMappings]) => {
          const request: CreateBulkFieldMappingRequest = {
            projectId: selectedProject.id,
            schemaId: Number(schemaId),
            fieldMappings: schemaFieldMappings, // may be empty -> backend should clear
          };
          return fieldMappingService.createBulkFieldMapping(request);
        }
      );

      // Saving schema mappings
      await Promise.all(savePromises);

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Failed to save field mappings:", error);
      let errorMessage = "Failed to save field mappings";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Field Mapping</h1>
          <p className="text-muted-foreground">
            Select a client and configure field mappings for their assigned
            schemas.
          </p>
        </div>
      </div>

      {!selectedProject ? (
        // Project Selection Screen
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Project
            </CardTitle>
            <CardDescription>
              Choose the project for which you want to configure field mappings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <p>No projects available. Please add projects first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border rounded-lg cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {project.code}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          project.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {project.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Schema Fields Mapping Screen
        <div className="space-y-6">
          {/* Project Info Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    Project: {selectedProject.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Code: {selectedProject.code}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectSchemasWithFields([]);
                    setFieldMappings({});
                  }}
                >
                  Back to Project Selection
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoadingSchemas ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading schemas...</span>
            </div>
          ) : projectSchemasWithFields.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No schemas assigned to this project.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Please assign schemas to this project first.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Schema Fields grouped by Schema */}
              {projectSchemasWithFields.map((schema) => (
                <Card key={schema.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {schema.name}
                      <span className="text-sm font-normal text-gray-500">
                        Version {schema.version}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {schema.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {schema.schemaFields
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-4 p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <label className="font-medium text-gray-900">
                                  {field.fieldLabel}
                                </label>
                                {field.isRequired && (
                                  <span className="text-red-500 text-sm">
                                    *
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                Field Name: {field.fieldName} | Type:{" "}
                                {field.dataType}
                                {field.format && ` | Format: ${field.format}`}
                              </div>
                            </div>
                            <div className="w-64">
                              <input
                                type="text"
                                placeholder="Enter mapping value"
                                value={
                                  fieldMappings[`${schema.id}_${field.id}`] ||
                                  ""
                                }
                                onChange={(e) =>
                                  handleFieldMappingChange(
                                    schema.id,
                                    field.id,
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Save Button and Error Handling */}
              <div className="space-y-4">
                {saveError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700">{saveError}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveMappings}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save Field Mappings"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Field Mappings Saved Successfully"
      >
        <div className="text-center p-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Success!
          </h3>
          <p className="text-gray-600 mb-4">
            Field mappings for project "{selectedProject?.name}" have been saved
            successfully.
          </p>
          <p className="text-sm text-gray-500">
            You can continue editing or select a different project.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default FieldMappingPage;
