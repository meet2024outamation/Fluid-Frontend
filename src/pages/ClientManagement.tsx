import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  Users,
  Calendar,
  CheckCircle,
  Building2,
  FileText,
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
import { clientService, type ApiClient } from "../services/clientService";
import {
  schemaService,
  type SchemaListResponse,
} from "../services/schemaService";

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<ApiClient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ApiClient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<number | null>(null);

  // Schema assignment modal states
  const [showSchemaAssignmentModal, setShowSchemaAssignmentModal] =
    useState(false);
  const [clientForSchemaAssignment, setClientForSchemaAssignment] =
    useState<ApiClient | null>(null);
  const [availableSchemas, setAvailableSchemas] = useState<
    SchemaListResponse[]
  >([]);
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<number[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isAssigningSchemas, setIsAssigningSchemas] = useState(false);
  const [schemaAssignmentError, setSchemaAssignmentError] = useState<
    string | null
  >(null);
  const [assignedSchemas, setAssignedSchemas] = useState<SchemaListResponse[]>(
    []
  );

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Filter clients based on search term
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to load clients:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load clients"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);
      await clientService.deleteClient(clientToDelete.id);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (error) {
      console.error("Failed to delete client:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete client"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (client: ApiClient) => {
    try {
      setIsTogglingStatus(client.id);
      const updatedClient = await clientService.toggleClientStatus(
        client.id,
        !client.isActive
      );

      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? updatedClient : c))
      );
    } catch (error) {
      console.error("Failed to toggle client status:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update client status"
      );
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const openDeleteModal = (client: ApiClient) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const openSchemaAssignmentModal = async (client: ApiClient) => {
    setClientForSchemaAssignment(client);
    setSelectedSchemaIds([]);
    setSchemaAssignmentError(null);
    setShowSchemaAssignmentModal(true);

    // Load available schemas and assigned schemas
    setIsLoadingSchemas(true);
    try {
      // Load all active schemas
      const allSchemas = await schemaService.getAllSchemas();
      const activeSchemas = allSchemas.filter(
        (schema: SchemaListResponse) => schema.isActive
      );
      setAvailableSchemas(activeSchemas);

      // Load already assigned schemas for this client
      const clientAssignedSchemas = await schemaService.getSchemasByClientId(
        client.id
      );
      setAssignedSchemas(clientAssignedSchemas);

      // Pre-select the already assigned schemas
      const assignedSchemaIds = clientAssignedSchemas.map(
        (schema) => schema.id
      );
      setSelectedSchemaIds(assignedSchemaIds);
    } catch (error) {
      console.error("Failed to load schemas:", error);
      setSchemaAssignmentError("Failed to load schemas");
    } finally {
      setIsLoadingSchemas(false);
    }
  };

  const handleSchemaAssignment = async () => {
    if (!clientForSchemaAssignment || selectedSchemaIds.length === 0) {
      setSchemaAssignmentError("Please select at least one schema");
      return;
    }

    setIsAssigningSchemas(true);
    setSchemaAssignmentError(null);

    try {
      await clientService.assignSchemas({
        clientId: clientForSchemaAssignment.id,
        schemaIds: selectedSchemaIds,
      });

      // Close modal and refresh clients
      setShowSchemaAssignmentModal(false);
      setClientForSchemaAssignment(null);
      setSelectedSchemaIds([]);
      setAssignedSchemas([]);

      // Optionally show success message or refresh the list
      loadClients();
    } catch (error) {
      console.error("Failed to assign schemas:", error);
      setSchemaAssignmentError(
        error instanceof Error ? error.message : "Failed to assign schemas"
      );
    } finally {
      setIsAssigningSchemas(false);
    }
  };

  const handleSchemaSelection = (schemaId: number, isSelected: boolean) => {
    setSelectedSchemaIds((prev) =>
      isSelected ? [...prev, schemaId] : prev.filter((id) => id !== schemaId)
    );
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
                Client Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Create and manage client organizations and their configurations
              </p>
            </div>
            <Link to="/clients/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Client
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Clients
                    </p>
                    <p className="text-2xl font-bold">{clients.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Clients
                    </p>
                    <p className="text-2xl font-bold">
                      {clients.filter((c) => c.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Inactive Clients
                    </p>
                    <p className="text-2xl font-bold">
                      {clients.filter((c) => !c.isActive).length}
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
                  placeholder="Search clients by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                onClick={loadClients}
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

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              {filteredClients.length} of {clients.length} clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No clients found" : "No clients yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Get started by creating your first client"}
                </p>
                {!searchTerm && (
                  <Link to="/clients/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Client
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {client.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.isActive)}`}
                          >
                            {client.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            Code: {client.code}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Created {formatDate(client.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Link to={`/clients/edit/${client.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Button
                          onClick={() => openSchemaAssignmentModal(client)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          title="Assign Schemas"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>

                        <Button
                          onClick={() => handleToggleStatus(client)}
                          variant="outline"
                          size="sm"
                          disabled={isTogglingStatus === client.id}
                          className={
                            client.isActive
                              ? "text-yellow-600"
                              : "text-green-600"
                          }
                        >
                          {isTogglingStatus === client.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : client.isActive ? (
                            <ToggleLeft className="h-4 w-4" />
                          ) : (
                            <ToggleRight className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          onClick={() => openDeleteModal(client)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          title="Delete Client"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the client "{clientToDelete?.name}
              "? This action cannot be undone and will also delete all
              associated data including batches, orders, and field mappings.
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
                onClick={handleDeleteClient}
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

        {/* Schema Assignment Modal */}
        <Modal
          isOpen={showSchemaAssignmentModal}
          onClose={() => {
            setShowSchemaAssignmentModal(false);
            setClientForSchemaAssignment(null);
            setSelectedSchemaIds([]);
            setSchemaAssignmentError(null);
            setAssignedSchemas([]);
          }}
          title={`Assign Schemas to ${clientForSchemaAssignment?.name}`}
        >
          <div className="p-6">
            {schemaAssignmentError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  <p className="text-red-600 text-sm">
                    {schemaAssignmentError}
                  </p>
                </div>
              </div>
            )}

            {isLoadingSchemas ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading schemas...</span>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Select schemas to assign to this client. Currently assigned
                  schemas are highlighted and pre-selected.
                </p>

                {availableSchemas.length === 0 ? (
                  <p className="text-gray-500 py-4">
                    No active schemas available.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                    {availableSchemas.map((schema) => {
                      const isAssigned = assignedSchemas.some(
                        (assigned) => assigned.id === schema.id
                      );
                      return (
                        <label
                          key={schema.id}
                          className={`flex items-start gap-3 p-2 border rounded-md hover:bg-gray-50 cursor-pointer ${
                            isAssigned ? "bg-blue-50 border-blue-200" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSchemaIds.includes(schema.id)}
                            onChange={(e) =>
                              handleSchemaSelection(schema.id, e.target.checked)
                            }
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-gray-900">
                                {schema.name}
                              </div>
                              {isAssigned && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  Currently Assigned
                                </span>
                              )}
                            </div>
                            {schema.description && (
                              <div className="text-sm text-gray-500">
                                {schema.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400">
                              {schema.schemaFieldCount} fields • Version{" "}
                              {schema.version}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setShowSchemaAssignmentModal(false);
                  setClientForSchemaAssignment(null);
                  setSelectedSchemaIds([]);
                  setSchemaAssignmentError(null);
                  setAssignedSchemas([]);
                }}
                variant="outline"
                disabled={isAssigningSchemas}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSchemaAssignment}
                disabled={isAssigningSchemas || selectedSchemaIds.length === 0}
              >
                {isAssigningSchemas ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign ${selectedSchemaIds.length} Schema${selectedSchemaIds.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ClientManagement;
