import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  Database,
  Calendar,
  Hash,
  Copy,
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
import { useTenantSelection } from "../contexts/TenantSelectionContext";
import {
  schemaService,
  type Schema,
  type SchemaListResponse,
  type SectionDto,
  type SchemaField,
} from "../services/schemaService";
import type { ApiResponse } from "../types";

const SchemaManagement: React.FC = () => {
  const { isProductOwner } = useTenantSelection();
  const [schemas, setSchemas] = useState<SchemaListResponse[]>([]);
  const [globalSchemas, setGlobalSchemas] = useState<SchemaListResponse[]>([]);
  const [filteredSchemas, setFilteredSchemas] = useState<SchemaListResponse[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [showGlobalSchemas, setShowGlobalSchemas] = useState(!isProductOwner);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [schemaToDelete, setSchemaToDelete] =
    useState<SchemaListResponse | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [schemaToView, setSchemaToView] = useState<Schema | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDto | null>(null);
  const [sectionForm, setSectionForm] = useState<{
    name: string;
    description?: string;
    isActive: boolean;
    displayOrder?: number | null;
  }>({ name: "", description: "", isActive: true, displayOrder: undefined });
  const [sectionSaving, setSectionSaving] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<number | null>(null);

  const showErrorModal = (title: string, message: string) => {
    setErrorModalContent({ title, message });
    setIsErrorModalOpen(true);
  };

  useEffect(() => {
    loadSchemas();
    if (!isProductOwner) {
      loadGlobalSchemas();
    }
  }, [isProductOwner]);

  useEffect(() => {
    // Filter schemas based on search term
    const schemasToFilter = showGlobalSchemas ? globalSchemas : schemas;
    const filtered = schemasToFilter.filter(
      (schema) =>
        schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (schema.description &&
          schema.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSchemas(filtered);
  }, [schemas, globalSchemas, searchTerm, showGlobalSchemas]);

  const loadSchemas = async () => {
    try {
      setIsLoading(true);
      const response = await schemaService.getAllSchemas();
      if (response.success && response.data) {
        setSchemas(response.data);
      } else {
        showErrorModal(
          "Failed to Load Schemas",
          response.message || "Failed to load schemas"
        );
      }
    } catch (error) {
      console.error("Failed to load schemas:", error);
      showErrorModal(
        "Failed to Load Schemas",
        error instanceof Error ? error.message : "Failed to load schemas"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadGlobalSchemas = async () => {
    try {
      const response = await schemaService.getAllGlobalSchemas();
      if (response.success && response.data) {
        setGlobalSchemas(response.data);
      } else {
        showErrorModal(
          "Failed to Load Global Schemas",
          response.message || "Failed to load global schemas"
        );
      }
    } catch (error) {
      console.error("Failed to load global schemas:", error);
      showErrorModal(
        "Failed to Load Global Schemas",
        error instanceof Error ? error.message : "Failed to load global schemas"
      );
    }
  };

  const handleDeleteSchema = async () => {
    if (!schemaToDelete) return;

    try {
      setIsDeleting(true);
      await schemaService.deleteSchema(schemaToDelete.id);
      setSchemas((prev) => prev.filter((s) => s.id !== schemaToDelete.id));
      setShowDeleteModal(false);
      setSchemaToDelete(null);
    } catch (error) {
      console.error("Failed to delete schema:", error);
      showErrorModal(
        "Failed to Delete Schema",
        error instanceof Error ? error.message : "Failed to delete schema"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (schema: SchemaListResponse) => {
    try {
      setIsTogglingStatus(schema.id);
      const response = await schemaService.toggleSchemaStatus(
        schema.id,
        !schema.isActive
      );

      if (response.success && response.data) {
        const updatedSchema = response.data;
        // Convert the full Schema response to SchemaListResponse format
        const updatedListSchema: SchemaListResponse = {
          id: updatedSchema.id,
          name: updatedSchema.name,
          description: updatedSchema.description,
          version: 1, // Default or get from response
          isActive: updatedSchema.isActive,
          schemaFieldCount: updatedSchema.schemaFields?.length || 0,
          createdAt: updatedSchema.createdAt,
          createdByName: "Unknown", // Default or get from response
        };

        setSchemas((prev) =>
          prev.map((s) => (s.id === schema.id ? updatedListSchema : s))
        );
      } else {
        showErrorModal(
          "Failed to Toggle Schema Status",
          response.message || "Failed to toggle schema status"
        );
      }
    } catch (error) {
      console.error("Failed to toggle schema status:", error);
      showErrorModal(
        "Failed to Toggle Schema Status",
        error instanceof Error
          ? error.message
          : "Failed to update schema status"
      );
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleCloneGlobalSchema = async (globalSchema: SchemaListResponse) => {
    try {
      setIsLoading(true);

      // First get the full schema details from the global schema
      const globalResponse = await schemaService.getGlobalSchemaById(
        globalSchema.id
      );

      if (!globalResponse.success || !globalResponse.data) {
        showErrorModal(
          "Failed to Load Global Schema",
          globalResponse.message || "Failed to load global schema"
        );
        return;
      }

      const fullGlobalSchema = globalResponse.data;

      // Create a new schema request based on the global schema
      const cloneRequest = {
        name: `${fullGlobalSchema.name} (Cloned)`,
        description: `Cloned from global schema: ${fullGlobalSchema.description || ""}`,
        schemaFields:
          fullGlobalSchema.schemaFields?.map((field, index) => ({
            fieldName: field.fieldName,
            fieldLabel: field.fieldLabel,
            dataType: field.dataType,
            format: field.format,
            isRequired: field.isRequired,
            displayOrder: field.displayOrder || index + 1,
          })) || [],
      };

      // Create the cloned schema as a tenant schema
      const createResponse = await schemaService.createSchema(cloneRequest);

      if (!createResponse.success || !createResponse.data) {
        showErrorModal(
          "Failed to Create Cloned Schema",
          createResponse.message || "Failed to create cloned schema"
        );
        return;
      }

      const newSchema = createResponse.data;

      // Add to the schemas list and switch to "My Schemas" view
      setSchemas((prev) => [
        ...prev,
        {
          id: newSchema.id,
          name: newSchema.name,
          description: newSchema.description,
          version: 1,
          isActive: newSchema.isActive,
          schemaFieldCount: newSchema.schemaFields?.length || 0,
          createdAt: newSchema.createdAt,
          createdByName: "You",
        },
      ]);

      // Switch to My Schemas view to show the newly created schema
      setShowGlobalSchemas(false);
    } catch (error) {
      console.error("Failed to clone schema:", error);
      showErrorModal(
        "Failed to Clone Schema",
        error instanceof Error ? error.message : "Failed to clone schema"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (schema: SchemaListResponse) => {
    setSchemaToDelete(schema);
    setShowDeleteModal(true);
  };

  const openViewModal = async (schema: SchemaListResponse) => {
    try {
      // Use global schema API if viewing global schemas, else use tenant schema API
      let response: ApiResponse<Schema>;
      if (showGlobalSchemas && !isProductOwner) {
        response = await schemaService.getGlobalSchemaById(schema.id);
      } else {
        response = await schemaService.getSchemaById(schema.id);
      }

      if (response.success && response.data) {
        setSchemaToView(response.data);
        setShowViewModal(true);
        // initialize section expansion
        const init: Record<string, boolean> = {};
        response.data.sections?.forEach((sec) => (init[sec.id] = true));
        setExpandedSections(init);
      } else {
        showErrorModal(
          "Failed to Load Schema Details",
          response.message || "Failed to load schema details"
        );
      }
    } catch (error) {
      console.error("Failed to fetch schema details:", error);
      showErrorModal(
        "Failed to Load Schema Details",
        "Failed to load schema details"
      );
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateSection = () => {
    if (!schemaToView) return;
    setEditingSection(null);
    setSectionForm({
      name: "",
      description: "",
      isActive: true,
      displayOrder: (schemaToView.sections?.length || 0) + 1,
    });
    setShowSectionModal(true);
  };

  const openEditSection = (section: SectionDto) => {
    setEditingSection(section);
    setSectionForm({
      name: section.name,
      description: section.description || "",
      isActive: section.isActive ?? true,
      displayOrder: section.displayOrder ?? undefined,
    });
    setShowSectionModal(true);
  };

  const refreshSchemaDetails = async () => {
    if (!schemaToView) return;
    const res =
      showGlobalSchemas && !isProductOwner
        ? await schemaService.getGlobalSchemaById(schemaToView.id)
        : await schemaService.getSchemaById(schemaToView.id);
    if (res.success && res.data) {
      setSchemaToView(res.data);
    }
  };

  const handleSaveSection = async () => {
    if (!schemaToView) return;
    try {
      setSectionSaving(true);
      if (editingSection) {
        const res =
          showGlobalSchemas && !isProductOwner
            ? await schemaService.updateSection(
                schemaToView.id,
                String(editingSection.id),
                {
                  name: sectionForm.name,
                  description: sectionForm.description,
                  displayOrder: sectionForm.displayOrder,
                  isActive: sectionForm.isActive,
                }
              )
            : await schemaService.updateTenantSection(
                schemaToView.id,
                String(editingSection.id),
                {
                  name: sectionForm.name,
                  description: sectionForm.description,
                  displayOrder: sectionForm.displayOrder,
                  isActive: sectionForm.isActive,
                }
              );
        if (res.success && res.data) {
          const updatedSection = res.data;
          setSchemaToView((prev) => {
            if (!prev) return prev;
            const existingSections = prev.sections || [];
            return {
              ...prev,
              sections: existingSections.map((s) =>
                s.id === updatedSection.id ? updatedSection : s
              ),
            };
          });
        } else {
          showErrorModal(
            "Failed to Update Section",
            res.message || "Update failed"
          );
        }
      } else {
        const res =
          showGlobalSchemas && !isProductOwner
            ? await schemaService.createSection(schemaToView.id, {
                name: sectionForm.name,
                description: sectionForm.description,
                displayOrder: sectionForm.displayOrder,
                isActive: sectionForm.isActive,
              })
            : await schemaService.createTenantSection(schemaToView.id, {
                name: sectionForm.name,
                description: sectionForm.description,
                displayOrder: sectionForm.displayOrder,
                isActive: sectionForm.isActive,
              });
        if (res.success && res.data) {
          const newSection = res.data;
          setSchemaToView((prev) => {
            if (!prev) return prev;
            const existingSections = prev.sections || [];
            return { ...prev, sections: [...existingSections, newSection] };
          });
          setExpandedSections((prev) => ({ ...prev, [newSection.id]: true }));
        } else {
          showErrorModal(
            "Failed to Create Section",
            res.message || "Creation failed"
          );
        }
      }
      setShowSectionModal(false);
      await refreshSchemaDetails();
    } catch (err) {
      console.error("Section save failed", err);
      showErrorModal(
        "Section Save Failed",
        err instanceof Error ? err.message : "Failed to save section"
      );
    } finally {
      setSectionSaving(false);
    }
  };

  const handleDeleteSection = async (section: SectionDto) => {
    if (
      !confirm(
        `Delete section "${section.name}"? Its fields will become unassigned.`
      )
    )
      return;
    try {
      const res =
        showGlobalSchemas && !isProductOwner
          ? await schemaService.deleteSection(
              schemaToView!.id,
              String(section.id)
            )
          : await schemaService.deleteTenantSection(
              schemaToView!.id,
              String(section.id)
            );
      if (res.success) {
        setSchemaToView((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections?.filter((s) => s.id !== section.id),
              }
            : prev
        );
        await refreshSchemaDetails();
      } else {
        showErrorModal(
          "Failed to Delete Section",
          res.message || "Delete failed"
        );
      }
    } catch (err) {
      console.error("Delete section failed", err);
      showErrorModal(
        "Delete Section Failed",
        err instanceof Error ? err.message : "Failed to delete section"
      );
    }
  };

  const handleAssignFieldSection = async (
    field: SchemaField,
    sectionId: string | null
  ) => {
    try {
      const res =
        showGlobalSchemas && !isProductOwner
          ? await schemaService.assignFieldToSection(field.id, sectionId)
          : await schemaService.assignTenantFieldToSection(field.id, sectionId);
      if (res.success) {
        await refreshSchemaDetails();
      } else {
        showErrorModal(
          "Failed to Assign Field",
          res.message || "Assignment failed"
        );
      }
    } catch (err) {
      console.error("Assign field failed", err);
      showErrorModal(
        "Assign Field Failed",
        err instanceof Error ? err.message : "Failed to assign field"
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Schema Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage data schemas and their field definitions
              </p>
            </div>
            {(!isProductOwner ? !showGlobalSchemas : true) && (
              <Link to="/schemas/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Schema
                </Button>
              </Link>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Schemas
                    </p>
                    <p className="text-2xl font-bold">{schemas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Schemas
                    </p>
                    <p className="text-2xl font-bold">
                      {schemas.filter((s) => s.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Hash className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Fields
                    </p>
                    <p className="text-2xl font-bold">
                      {schemas.reduce(
                        (acc, schema) => acc + (schema.schemaFieldCount || 0),
                        0
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search schemas by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Schema Type Toggle for Tenant Admins */}
              {!isProductOwner && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowGlobalSchemas(true)}
                    variant={showGlobalSchemas ? "default" : "outline"}
                    size="sm"
                  >
                    Global Schemas
                  </Button>
                  <Button
                    onClick={() => setShowGlobalSchemas(false)}
                    variant={!showGlobalSchemas ? "default" : "outline"}
                    size="sm"
                  >
                    My Schemas
                  </Button>
                </div>
              )}

              <Button
                onClick={loadSchemas}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error messages now shown via modal */}

        {/* Schemas List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {!isProductOwner && showGlobalSchemas
                ? "Global Schemas"
                : "Schemas"}
            </CardTitle>
            <CardDescription>
              {!isProductOwner && showGlobalSchemas
                ? `${filteredSchemas.length} of ${globalSchemas.length} global schemas available to clone`
                : `${filteredSchemas.length} of ${schemas.length} schemas`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading schemas...
              </div>
            ) : filteredSchemas.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm
                    ? "No schemas found"
                    : !isProductOwner && showGlobalSchemas
                      ? "No global schemas available"
                      : "No schemas yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : !isProductOwner && showGlobalSchemas
                      ? "No global schemas are currently available to clone"
                      : "Get started by creating your first schema"}
                </p>
                {!searchTerm &&
                  (!isProductOwner ? !showGlobalSchemas : true) && (
                    <Link to="/schemas/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Schema
                      </Button>
                    </Link>
                  )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSchemas.map((schema) => (
                  <div
                    key={schema.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {schema.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schema.isActive)}`}
                          >
                            {schema.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {schema.description && (
                          <p className="text-gray-600 mb-2">
                            {schema.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Hash className="h-4 w-4" />
                            {schema.schemaFieldCount || 0} fields
                          </div>
                          <div className="flex items-center gap-1">
                            <Database className="h-4 w-4" />
                            Version {schema.version}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Created {formatDate(schema.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {showGlobalSchemas && !isProductOwner ? (
                          // For tenant admins viewing global schemas - only show view and clone
                          <>
                            <Button
                              onClick={() => openViewModal(schema)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleCloneGlobalSchema(schema)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              disabled={isLoading}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          // For product owners or tenant admins viewing their own schemas - full actions
                          <>
                            <Button
                              onClick={() => openViewModal(schema)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Link to={`/schemas/edit/${schema.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>

                            <Button
                              onClick={() => handleToggleStatus(schema)}
                              variant="outline"
                              size="sm"
                              disabled={isTogglingStatus === schema.id}
                              className={
                                schema.isActive
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }
                            >
                              {isTogglingStatus === schema.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : schema.isActive ? (
                                <ToggleLeft className="h-4 w-4" />
                              ) : (
                                <ToggleRight className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              onClick={() => openDeleteModal(schema)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Schema"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the schema "{schemaToDelete?.name}
              "? This action cannot be undone and will also delete all
              associated field mappings.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSchema}
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* View Schema Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Schema: ${schemaToView?.name}${schemaToView?.version ? ` (Version ${schemaToView.version})` : ""}`}
          maxWidth="4xl"
        >
          {schemaToView && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Description
                    </h4>
                    <p className="text-gray-600">
                      {schemaToView.description || "No description provided"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(schemaToView.isActive)}`}
                    >
                      {schemaToView.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Version</h4>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Database className="h-4 w-4" />
                      Version {schemaToView.version}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Created</h4>
                    <p className="text-gray-600">
                      {formatDate(schemaToView.createdAt)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Total Fields
                    </h4>
                    <p className="text-gray-600">
                      {schemaToView.schemaFields?.length || 0} fields
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Sections & Fields
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openCreateSection}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Section
                    </Button>
                  </div>
                </div>

                {/* Section Groups */}
                {schemaToView.sections && schemaToView.sections.length > 0 && (
                  <div className="space-y-4">
                    {schemaToView.sections
                      .slice()
                      .sort(
                        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
                      )
                      .map((section) => (
                        <div
                          key={section.id}
                          className="border rounded-lg bg-white"
                        >
                          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 rounded-t-lg">
                            <button
                              onClick={() => toggleSection(String(section.id))}
                              className="font-medium text-gray-800 text-left flex-1"
                            >
                              {expandedSections[String(section.id)] ? "−" : "+"}{" "}
                              {section.displayOrder || 0}. {section.name}
                              <span className="ml-2 text-xs text-gray-500">
                                ({section.fields?.length || 0} fields)
                              </span>
                            </button>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditSection(section)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSection(section)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                          {expandedSections[String(section.id)] && (
                            <div className="p-4 space-y-3">
                              {(section.fields?.length || 0) === 0 && (
                                <p className="text-xs text-gray-500">
                                  No fields in this section.
                                </p>
                              )}
                              {(section.fields || [])
                                .slice()
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .map((field) => (
                                  <div
                                    key={field.id}
                                    className="p-3 border rounded-lg hover:bg-gray-50 flex items-start justify-between"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1">
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                          {field.displayOrder}
                                        </span>
                                        <h5 className="font-medium text-gray-900">
                                          {field.fieldLabel || field.fieldName}
                                          {field.isRequired && (
                                            <span className="text-red-500 ml-1">
                                              *
                                            </span>
                                          )}
                                        </h5>
                                      </div>
                                      <div className="ml-9 flex flex-wrap gap-4 text-xs text-gray-600">
                                        <span>
                                          <strong>Name:</strong>{" "}
                                          {field.fieldName}
                                        </span>
                                        <span>
                                          <strong>Type:</strong>{" "}
                                          {field.dataType}
                                        </span>
                                        {field.format && (
                                          <span>
                                            <strong>Format:</strong>{" "}
                                            {field.format}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <select
                                        className="text-xs border rounded px-1 py-0.5"
                                        value={field.sectionId ?? section.id}
                                        onChange={(e) =>
                                          handleAssignFieldSection(
                                            field,
                                            e.target.value || null
                                          )
                                        }
                                      >
                                        <option value="">Unassigned</option>
                                        {schemaToView.sections?.map((sec) => (
                                          <option key={sec.id} value={sec.id}>
                                            {sec.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Unassigned Fields */}
                {schemaToView.unassignedFields &&
                  schemaToView.unassignedFields.length > 0 && (
                    <div className="border rounded-lg bg-white">
                      <div className="px-4 py-2 border-b bg-yellow-50 rounded-t-lg flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          Unassigned Fields (
                          {schemaToView.unassignedFields.length})
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {schemaToView.unassignedFields
                          .slice()
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((field) => (
                            <div
                              key={field.id}
                              className="p-3 border rounded-lg hover:bg-gray-50 flex items-start justify-between"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                    {field.displayOrder}
                                  </span>
                                  <h5 className="font-medium text-gray-900">
                                    {field.fieldLabel || field.fieldName}
                                    {field.isRequired && (
                                      <span className="text-red-500 ml-1">
                                        *
                                      </span>
                                    )}
                                  </h5>
                                </div>
                                <div className="ml-9 flex flex-wrap gap-4 text-xs text-gray-600">
                                  <span>
                                    <strong>Name:</strong> {field.fieldName}
                                  </span>
                                  <span>
                                    <strong>Type:</strong> {field.dataType}
                                  </span>
                                  {field.format && (
                                    <span>
                                      <strong>Format:</strong> {field.format}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <select
                                  className="text-xs border rounded px-1 py-0.5"
                                  value=""
                                  onChange={(e) =>
                                    handleAssignFieldSection(
                                      field,
                                      e.target.value || null
                                    )
                                  }
                                >
                                  <option value="">Unassigned</option>
                                  {schemaToView.sections?.map((sec) => (
                                    <option key={sec.id} value={sec.id}>
                                      {sec.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </Modal>

        {showSectionModal && (
          <Modal
            isOpen={showSectionModal}
            onClose={() => setShowSectionModal(false)}
            title={editingSection ? "Edit Section" : "Add Section"}
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={sectionForm.name}
                    maxLength={255}
                    onChange={(e) =>
                      setSectionForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={sectionForm.displayOrder ?? ""}
                    min={1}
                    onChange={(e) =>
                      setSectionForm((f) => ({
                        ...f,
                        displayOrder:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm resize-y min-h-[80px]"
                  value={sectionForm.description}
                  maxLength={1000}
                  onChange={(e) =>
                    setSectionForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional section description"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {sectionForm.description?.length || 0}/1000
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="tenant-section-active"
                  type="checkbox"
                  checked={sectionForm.isActive}
                  onChange={(e) =>
                    setSectionForm((f) => ({
                      ...f,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="tenant-section-active"
                  className="text-sm font-medium text-gray-700"
                >
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSectionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSection}
                  disabled={sectionSaving || !sectionForm.name.trim()}
                >
                  {sectionSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Error Modal */}
        <Modal
          isOpen={isErrorModalOpen}
          onClose={() => {
            setIsErrorModalOpen(false);
            setErrorModalContent(null);
          }}
          title={errorModalContent?.title || "Error"}
        >
          <div className="text-center p-6">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{errorModalContent?.message}</p>
            <Button
              onClick={() => {
                setIsErrorModalOpen(false);
                setErrorModalContent(null);
              }}
              className="mt-4"
            >
              OK
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default SchemaManagement;
