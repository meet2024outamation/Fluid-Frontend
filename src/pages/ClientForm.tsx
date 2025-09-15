import React, { useState, useEffect } from "react";
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
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
  clientService,
  type ApiClient,
  type CreateClientRequest,
  type UpdateClientRequest,
} from "../services/clientService";

const ClientForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const clientId = id ? parseInt(id) : null;
  const isEditMode = clientId !== null;
  const isCreateMode = !isEditMode;

  const [originalClient, setOriginalClient] = useState<ApiClient | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    isActive: true,
  });

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (isEditMode && clientId && clientId > 0) {
      loadClient();
    }
  }, [clientId, isEditMode]);

  const loadClient = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      const client = await clientService.getClientById(clientId);
      setOriginalClient(client);

      setFormData({
        name: client.name,
        code: client.code,
        isActive: client.isActive,
      });
    } catch (error) {
      console.error("Failed to load client:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to load client"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    if (isCreateMode) {
      const createRequest: CreateClientRequest = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        isActive: formData.isActive,
      };

      const validation = clientService.validateClient(createRequest);
      setValidationErrors(validation.errors);
      return validation.isValid;
    } else {
      const updateRequest: UpdateClientRequest = {
        id: clientId!,
        name: formData.name.trim(),
        code: formData.code.trim(),
        isActive: formData.isActive,
      };

      const validation = clientService.validateClient(updateRequest);
      setValidationErrors(validation.errors);
      return validation.isValid;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isCreateMode) {
        const request: CreateClientRequest = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          isActive: formData.isActive,
        };

        await clientService.createClient(request);
      } else {
        const request: UpdateClientRequest = {
          id: clientId!,
          name: formData.name.trim(),
          code: formData.code.trim(),
          isActive: formData.isActive,
        };

        await clientService.updateClient(request);
      }

      setShowSuccessModal(true);

      // Redirect after a brief delay
      setTimeout(() => {
        navigate("/clients");
      }, 2000);
    } catch (error) {
      console.error(
        `Failed to ${isCreateMode ? "create" : "update"} client:`,
        error
      );
      setSubmitError(
        error instanceof Error
          ? error.message
          : `Failed to ${isCreateMode ? "create" : "update"} client`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading client...
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode && !originalClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Client not found
            </h3>
            <p className="text-gray-600 mb-4">
              The client you're looking for doesn't exist.
            </p>
            <Link to="/clients">
              <Button>Back to Client Management</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/clients"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Client Management
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-4">
            {isCreateMode
              ? "Create New Client"
              : `Edit Client: ${originalClient?.name}`}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isCreateMode
              ? "Add a new client organization to the system"
              : "Modify client details and configuration"}
          </p>
        </div>

        <div className="space-y-6">
          {/* Client Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>
                Basic details about the client organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Acme Corporation"
                    maxLength={255}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The full legal name of the client organization
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      handleInputChange("code", e.target.value.toUpperCase())
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g., ACME001"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for the client (letters, numbers,
                    underscores, hyphens only)
                  </p>
                </div>
              </div>

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
                  <span className="text-sm font-medium">Client is active</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Inactive clients cannot be used for new batches or processing
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {isCreateMode ? "Creating Client..." : "Updating Client..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isCreateMode ? "Create Client" : "Update Client"}
                </>
              )}
            </Button>

            <Link to="/clients">
              <Button variant="outline" size="lg" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
          </div>
        </div>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title={`Client ${isCreateMode ? "Created" : "Updated"} Successfully`}
        >
          <div className="text-center p-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Success!
            </h3>
            <p className="text-gray-600 mb-4">
              The client "{formData.name}" has been{" "}
              {isCreateMode ? "created" : "updated"} successfully.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to client management...
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ClientForm;
