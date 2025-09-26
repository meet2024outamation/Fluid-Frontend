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
} from "../services/schemaService";

const SchemaManagement: React.FC = () => {
  const { isProductOwner } = useTenantSelection();
  const [schemas, setSchemas] = useState<SchemaListResponse[]>([]);
  const [globalSchemas, setGlobalSchemas] = useState<SchemaListResponse[]>([]);
  const [filteredSchemas, setFilteredSchemas] = useState<SchemaListResponse[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGlobalSchemas, setShowGlobalSchemas] = useState(!isProductOwner);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [schemaToDelete, setSchemaToDelete] =
    useState<SchemaListResponse | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [schemaToView, setSchemaToView] = useState<Schema | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<number | null>(null);

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
      setError(null);
      const data = await schemaService.getAllSchemas();
      setSchemas(data);
    } catch (error) {
      console.error("Failed to load schemas:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load schemas"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadGlobalSchemas = async () => {
    try {
      setError(null);
      // For now, we'll use the same endpoint but in the future this could be a separate endpoint
      const data = await schemaService.getAllGlobalSchemas();
      setGlobalSchemas(data);
    } catch (error) {
      console.error("Failed to load global schemas:", error);
      setError(
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
      setError(
        error instanceof Error ? error.message : "Failed to delete schema"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (schema: SchemaListResponse) => {
    try {
      setIsTogglingStatus(schema.id);
      const updatedSchema = await schemaService.toggleSchemaStatus(
        schema.id,
        !schema.isActive
      );

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
    } catch (error) {
      console.error("Failed to toggle schema status:", error);
      setError(
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
      const fullGlobalSchema = await schemaService.getGlobalSchemaById(
        globalSchema.id
      );

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
      const newSchema = await schemaService.createSchema(cloneRequest);

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
      setError(
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
      let fullSchema: Schema;
      if (showGlobalSchemas && !isProductOwner) {
        fullSchema = await schemaService.getGlobalSchemaById(schema.id);
      } else {
        fullSchema = await schemaService.getSchemaById(schema.id);
      }
      setSchemaToView(fullSchema);
      setShowViewModal(true);
    } catch (error) {
      console.error("Failed to fetch schema details:", error);
      setError("Failed to load schema details");
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

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
              {/* Schema Basic Info */}
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

              {/* Schema Fields */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Schema Fields
                  </h4>
                  <span className="text-sm text-gray-500">
                    {schemaToView.schemaFields?.length || 0} fields
                  </span>
                </div>

                {schemaToView.schemaFields &&
                schemaToView.schemaFields.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                    <div className="space-y-0 divide-y divide-gray-100">
                      {schemaService
                        .sortSchemaFields(schemaToView.schemaFields)
                        .map((field) => (
                          <div
                            key={field.id}
                            className="p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                    {field.displayOrder}
                                  </span>
                                  <div>
                                    <h5 className="font-semibold text-gray-900 text-lg">
                                      {field.fieldLabel}
                                      {field.isRequired && (
                                        <span className="text-red-500 ml-1">
                                          *
                                        </span>
                                      )}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-gray-500 text-sm font-medium">
                                        Field Name:
                                      </span>
                                      <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-sm">
                                        {field.fieldName}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {field.format && (
                                  <div className="flex items-center gap-2 ml-11">
                                    <span className="text-gray-500 text-sm font-medium">
                                      Format:
                                    </span>
                                    <span className="text-gray-700 text-sm">
                                      {field.format}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 ml-6">
                                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                  {schemaService.getDataTypeDisplayName(
                                    field.dataType
                                  )}
                                </span>

                                {field.isRequired && (
                                  <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg">
                    <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No fields defined</p>
                    <p className="text-sm">
                      This schema doesn't have any fields yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default SchemaManagement;
