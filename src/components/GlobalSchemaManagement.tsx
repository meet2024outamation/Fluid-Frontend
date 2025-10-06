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
import {
  schemaService,
  type Schema,
  type SchemaListResponse,
} from "../services/schemaService";

const GlobalSchemaManagement: React.FC = () => {
  const [schemas, setSchemas] = useState<SchemaListResponse[]>([]);
  const [filteredSchemas, setFilteredSchemas] = useState<SchemaListResponse[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [schemaToDelete, setSchemaToDelete] =
    useState<SchemaListResponse | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [schemaToView, setSchemaToView] = useState<Schema | null>(null);
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
    loadGlobalSchemas();
  }, []);

  useEffect(() => {
    // Filter schemas based on search term
    const filtered = schemas.filter(
      (schema) =>
        schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (schema.description &&
          schema.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSchemas(filtered);
  }, [schemas, searchTerm]);

  const loadGlobalSchemas = async () => {
    try {
      setIsLoading(true);
      const response = await schemaService.getAllGlobalSchemas();
      if (response.success && response.data) {
        setSchemas(response.data);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchema = async () => {
    if (!schemaToDelete) return;

    try {
      setIsDeleting(true);
      await schemaService.deleteGlobalSchema(schemaToDelete.id);
      setSchemas((prev) => prev.filter((s) => s.id !== schemaToDelete.id));
      setShowDeleteModal(false);
      setSchemaToDelete(null);
    } catch (error) {
      console.error("Failed to delete global schema:", error);
      showErrorModal(
        "Failed to Delete Schema",
        error instanceof Error
          ? error.message
          : "Failed to delete global schema"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (schema: SchemaListResponse) => {
    try {
      setIsTogglingStatus(schema.id);
      const response = await schemaService.toggleGlobalSchemaStatus(
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

  const openDeleteModal = (schema: SchemaListResponse) => {
    setSchemaToDelete(schema);
    setShowDeleteModal(true);
  };

  const openViewModal = async (schema: SchemaListResponse) => {
    try {
      // Fetch the full schema details for the view modal
      const response = await schemaService.getGlobalSchemaById(schema.id);
      if (response.success && response.data) {
        setSchemaToView(response.data);
        setShowViewModal(true);
      } else {
        showErrorModal(
          "Failed to Load Schema Details",
          response.message || "Failed to load global schema details"
        );
      }
    } catch (error) {
      console.error("Failed to fetch global schema details:", error);
      showErrorModal(
        "Failed to Load Schema Details",
        "Failed to load global schema details"
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
                Global Schema Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage global data schemas and their field
                definitions
              </p>
            </div>
            <Link to="/global-schemas/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Global Schema
              </Button>
            </Link>
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
                      Total Global Schemas
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
                      {schemas.reduce((sum, s) => sum + s.schemaFieldCount, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search global schemas..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={loadGlobalSchemas}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading global schemas...</p>
          </div>
        ) : filteredSchemas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm
                  ? "No matching global schemas"
                  : "No global schemas found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first global schema"}
              </p>
              {!searchTerm && (
                <Link to="/global-schemas/create">
                  <Button className="flex items-center gap-2 mx-auto">
                    <Plus className="h-4 w-4" />
                    Create Global Schema
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Global Schemas Table */
          <Card>
            <CardHeader>
              <CardTitle>Global Schemas ({filteredSchemas.length})</CardTitle>
              <CardDescription>
                Manage your global data schemas and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Fields
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Created
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchemas.map((schema) => (
                      <tr key={schema.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {schema.name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {schema.description || "No description"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              {schema.schemaFieldCount}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStatus(schema)}
                            disabled={isTogglingStatus === schema.id}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              schema.isActive
                            )} hover:opacity-80 transition-opacity`}
                          >
                            {isTogglingStatus === schema.id ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : schema.isActive ? (
                              <ToggleRight className="h-3 w-3" />
                            ) : (
                              <ToggleLeft className="h-3 w-3" />
                            )}
                            {schema.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {formatDate(schema.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewModal(schema)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Link to={`/global-schemas/edit/${schema.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(schema)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Global Schema"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the global schema{" "}
              <strong>"{schemaToDelete?.name}"</strong>? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSchema}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                {isDeleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </Modal>

        {/* View Global Schema Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Global Schema: ${schemaToView?.name}`}
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
                      This global schema doesn't have any fields yet
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </div>
          )}
        </Modal>

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

export default GlobalSchemaManagement;
