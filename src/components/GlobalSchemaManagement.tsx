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
  type SectionDto,
  type SchemaField,
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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
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
      setIsLoadingDetails(true);
      setShowViewModal(true);
      const response = await schemaService.getGlobalSchemaDetails(
        String(schema.id)
      );
      if (response.success && response.data) {
        setSchemaToView(response.data);
        const init: Record<string, boolean> = {};
        response.data.sections?.forEach((sec) => {
          init[sec.id] = true;
        });
        setExpandedSections(init);
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
        error instanceof Error
          ? error.message
          : "Failed to load global schema details"
      );
    } finally {
      setIsLoadingDetails(false);
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

  const handleSaveSection = async () => {
    if (!schemaToView) return;
    try {
      setSectionSaving(true);
      if (editingSection) {
        const res = await schemaService.updateSection(
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
        const res = await schemaService.createSection(schemaToView.id, {
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
      const res = await schemaService.deleteSection(
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
        // Optionally refresh details to move fields to unassigned
        const refreshed = await schemaService.getGlobalSchemaDetails(
          String(schemaToView!.id)
        );
        if (refreshed.success && refreshed.data) {
          setSchemaToView(refreshed.data);
        }
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
      const res = await schemaService.assignFieldToSection(field.id, sectionId);
      if (res.success) {
        // refresh schema details to update groupings
        const refreshed = await schemaService.getGlobalSchemaDetails(
          String(schemaToView!.id)
        );
        if (refreshed.success && refreshed.data)
          setSchemaToView(refreshed.data);
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

              {/* Sections and Fields */}
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

                {isLoadingDetails && (
                  <div className="text-sm text-gray-500">
                    Loading sections...
                  </div>
                )}

                {!isLoadingDetails && (
                  <>
                    {/* Section Groups */}
                    {schemaToView.sections &&
                      schemaToView.sections.length > 0 && (
                        <div className="space-y-4">
                          {schemaToView.sections
                            .slice()
                            .sort(
                              (a, b) =>
                                (a.displayOrder || 0) - (b.displayOrder || 0)
                            )
                            .map((section) => (
                              <div
                                key={section.id}
                                className="border rounded-lg bg-white"
                              >
                                <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 rounded-t-lg">
                                  <button
                                    onClick={() =>
                                      toggleSection(String(section.id))
                                    }
                                    className="font-medium text-gray-800 text-left flex-1"
                                  >
                                    {expandedSections[String(section.id)]
                                      ? "−"
                                      : "+"}{" "}
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
                                      onClick={() =>
                                        handleDeleteSection(section)
                                      }
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
                                      .sort(
                                        (a, b) =>
                                          a.displayOrder - b.displayOrder
                                      )
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
                                                {field.fieldLabel ||
                                                  field.fieldName}
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
                                              value={
                                                field.sectionId ?? section.id
                                              }
                                              onChange={(e) =>
                                                handleAssignFieldSection(
                                                  field,
                                                  e.target.value || null
                                                )
                                              }
                                            >
                                              <option value="">
                                                Unassigned
                                              </option>
                                              {schemaToView.sections?.map(
                                                (sec) => (
                                                  <option
                                                    key={sec.id}
                                                    value={sec.id}
                                                  >
                                                    {sec.name}
                                                  </option>
                                                )
                                              )}
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
                                          <strong>Format:</strong>{" "}
                                          {field.format}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <select
                                      className="text-xs border rounded px-1 py-0.5"
                                      value={""}
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
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Section Create/Edit Modal */}
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
                  id="section-active"
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
                  htmlFor="section-active"
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

export default GlobalSchemaManagement;
