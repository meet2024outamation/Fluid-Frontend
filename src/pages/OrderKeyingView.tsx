import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Sidebar,
  Maximize2,
  Eye,
  AlertCircle,
  CheckCircle2,
  FileText,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import {
  PdfViewer,
  type PdfViewerHandle,
} from "../components/pdf-viewer/PdfViewer";
import {
  orderSchemaService,
  type OrderSchemaResponse,
  type SchemaField,
  type DocumentMetadata,
} from "../services/orderSchemaService";

type LayoutMode = "side-by-side" | "full-page";

interface FieldValue {
  fieldId: number;
  value: string;
}

const OrderKeyingView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  // State management
  const [orderSchema, setOrderSchema] = useState<OrderSchemaResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Map<number, string>>(
    new Map()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

  // Layout and UI state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("side-by-side");
  const [sidebarWidth] = useState(400);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [pdfWindow, setPdfWindow] = useState<Window | null>(null);

  // Current document state
  const [currentDocument, setCurrentDocument] =
    useState<DocumentMetadata | null>(null);

  // Cleanup PDF window on component unmount
  useEffect(() => {
    return () => {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.close();
      }
    };
  }, [pdfWindow]);

  useEffect(() => {
    if (!id) {
      setError("No order ID provided");
      setIsLoading(false);
      return;
    }

    fetchOrderSchema(parseInt(id, 10));
  }, [id]);

  const fetchOrderSchema = async (orderId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const schema = await orderSchemaService.getOrderSchema(orderId);

      // Validate the response structure
      if (!schema) {
        throw new Error("No schema data received from server");
      }

      // Ensure schemaFields is an array
      if (!Array.isArray(schema.schemaFields)) {
        console.warn(
          "Schema fields is not an array, initializing as empty array:",
          schema.schemaFields
        );
        schema.schemaFields = [];
      }

      // Ensure documents is an array
      if (!Array.isArray(schema.documents)) {
        console.warn(
          "Documents is not an array, initializing as empty array:",
          schema.documents
        );
        schema.documents = [];
      }

      setOrderSchema(schema);

      // Initialize field values with existing keying values
      const initialValues = new Map<number, string>();
      schema.schemaFields.forEach((field) => {
        if (field && field.keyingValue) {
          initialValues.set(field.id, field.keyingValue);
        }
      });
      setFieldValues(initialValues);

      // Set primary document or first available document
      if (schema.documents && schema.documents.length > 0) {
        const primaryDoc = schema.primaryDocumentId
          ? schema.documents.find((doc) => doc.id === schema.primaryDocumentId)
          : schema.documents[0];
        setCurrentDocument(primaryDoc || schema.documents[0]);
      }
    } catch (err) {
      console.error("Failed to fetch order schema:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load order schema"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldValueChange = (fieldId: number, value: string) => {
    const newValues = new Map(fieldValues);
    newValues.set(fieldId, value);
    setFieldValues(newValues);
  };

  const handleFieldFocus = (field: SchemaField) => {
    setSelectedFieldId(field.id);

    // Highlight field coordinates in PDF if available
    if (field.coordinates && pdfViewerRef.current) {
      pdfViewerRef.current.highlightRegion(field.coordinates);

      // Navigate to the page if different
      if (field.coordinates.page !== pdfViewerRef.current.getCurrentPage()) {
        pdfViewerRef.current.goToPage(field.coordinates.page);
      }
    }
  };

  const handleSaveKeying = async () => {
    if (!orderSchema || !id) return;

    try {
      setIsSaving(true);

      const fieldValuesArray: FieldValue[] = Array.from(
        fieldValues.entries()
      ).map(([fieldId, value]) => ({
        fieldId,
        value: value.trim(),
      }));

      await orderSchemaService.updateKeyingValues(
        parseInt(id, 10),
        fieldValuesArray
      );

      setLastSaved(new Date());
      setShowSaveConfirmation(true);

      // Hide confirmation after 3 seconds
      setTimeout(() => setShowSaveConfirmation(false), 3000);
    } catch (err) {
      console.error("Failed to save keying values:", err);
      // Could add error notification here
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldValue = (fieldId: number): string => {
    return fieldValues.get(fieldId) || "";
  };

  const hasUnsavedChanges = (): boolean => {
    if (
      !orderSchema ||
      !orderSchema.schemaFields ||
      !Array.isArray(orderSchema.schemaFields)
    ) {
      return false;
    }

    return orderSchema.schemaFields.some((field) => {
      const currentValue = getFieldValue(field.id);
      const originalValue = field.keyingValue || "";
      return currentValue !== originalValue;
    });
  };

  const renderFieldInput = (field: SchemaField) => {
    const value = getFieldValue(field.id);
    const isSelected = selectedFieldId === field.id;

    const inputProps = {
      id: `field-${field.id}`,
      value,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => handleFieldValueChange(field.id, e.target.value),
      onFocus: () => handleFieldFocus(field),
      onBlur: () => setSelectedFieldId(null),
      className: `w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        isSelected ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-300"
      } ${field.isRequired && !value ? "border-red-300 bg-red-50" : ""}`,
      placeholder:
        field.defaultValue || `Enter ${field.displayName.toLowerCase()}...`,
      required: field.isRequired,
    };

    if (field.dataType === "text" && field.description?.includes("multiline")) {
      return (
        <textarea
          {...inputProps}
          rows={3}
          className={`${inputProps.className} resize-vertical`}
        />
      );
    }

    return (
      <input
        {...inputProps}
        type={
          field.dataType === "number"
            ? "number"
            : field.dataType === "date"
              ? "date"
              : "text"
        }
      />
    );
  };

  const renderSchemaFields = (isFullPage = false) => {
    if (
      !orderSchema ||
      !orderSchema.schemaFields ||
      !Array.isArray(orderSchema.schemaFields)
    ) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No schema fields available for this order.
          </p>
        </div>
      );
    }

    // Group fields by schema name
    const fieldsBySchema = orderSchema.schemaFields.reduce(
      (acc, field) => {
        const schemaName = field.schemaName || "Other Fields";
        if (!acc[schemaName]) {
          acc[schemaName] = [];
        }
        acc[schemaName].push(field);
        return acc;
      },
      {} as Record<string, SchemaField[]>
    );

    // Sort fields within each group
    Object.keys(fieldsBySchema).forEach((schemaName) => {
      fieldsBySchema[schemaName].sort((a, b) => a.order - b.order);
    });

    if (isFullPage) {
      // Professional grid layout for full page mode
      return (
        <div className="space-y-8">
          {Object.entries(fieldsBySchema).map(([schemaName, fields]) => (
            <div
              key={schemaName}
              className="bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              {/* Schema Group Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {schemaName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {fields.length} field{fields.length !== 1 ? "s" : ""} to
                      complete
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {fields.filter((f) => getFieldValue(f.id)).length}/
                      {fields.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className={`bg-gray-50 rounded-lg p-4 border transition-all duration-200 hover:shadow-md ${
                        selectedFieldId === field.id
                          ? "ring-2 ring-blue-500 shadow-lg bg-blue-50 border-blue-300"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <label
                          htmlFor={`field-${field.id}`}
                          className="block text-sm font-semibold text-gray-800"
                        >
                          {field.displayName}
                          {field.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>

                        <div className="flex items-center space-x-2">
                          {field.coordinates && (
                            <button
                              onClick={() => handleFieldFocus(field)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
                              title="Highlight in PDF"
                            >
                              <Target className="w-4 h-4" />
                            </button>
                          )}
                          {getFieldValue(field.id) && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      </div>

                      <div className="mb-2">{renderFieldInput(field)}</div>

                      {field.description && (
                        <p className="text-xs text-gray-600 mb-1">
                          {field.description}
                        </p>
                      )}

                      {field.validationRules && (
                        <p className="text-xs text-gray-500">
                          Rules: {field.validationRules}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Sidebar layout for side-by-side mode
    return (
      <div className="space-y-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Schema Fields
          </h3>
          <p className="text-sm text-gray-600">
            Click on a field to highlight its location in the PDF
          </p>
        </div>

        {Object.entries(fieldsBySchema).map(([schemaName, fields]) => (
          <div key={schemaName} className="space-y-3">
            {/* Schema Group Header */}
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="text-base font-semibold text-gray-800">
                {schemaName}
              </h4>
              <p className="text-sm text-gray-500">
                {fields.length} field{fields.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Fields in this schema group */}
            <div className="space-y-3 ml-4">
              {fields.map((field) => (
                <Card
                  key={field.id}
                  className={`transition-all duration-200 ${
                    selectedFieldId === field.id
                      ? "ring-2 ring-blue-500 shadow-md"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <label
                        htmlFor={`field-${field.id}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        {field.displayName}
                        {field.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>

                      <div className="flex items-center space-x-1">
                        {field.coordinates && (
                          <button
                            onClick={() => handleFieldFocus(field)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Highlight in PDF"
                          >
                            <Target className="w-3 h-3" />
                          </button>
                        )}
                        {getFieldValue(field.id) && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>

                    {renderFieldInput(field)}

                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {field.description}
                      </p>
                    )}

                    {field.validationRules && (
                      <p className="text-xs text-gray-400 mt-1">
                        Rules: {field.validationRules}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to construct proper PDF URL from API response
  const getDocumentUrl = (document: DocumentMetadata) => {
    if (!document || !document.url) return "";

    let pdfUrl = document.url;

    // The API returns relative paths like "PRJ001/documents/filename.pdf"
    // We need to construct the full URL for the document
    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      window.location.origin;

    const uploadsPath = import.meta.env.VITE_UPLOADS_PATH || "uploads";

    // If URL is already absolute, return as is
    if (pdfUrl.startsWith("http")) {
      return pdfUrl;
    }

    // If URL starts with '/', it's a root-relative path
    if (pdfUrl.startsWith("/")) {
      return `${baseUrl}${pdfUrl}`;
    }

    // For relative paths from API response, construct the full URL
    // URL structure: {baseUrl}/{uploadsPath}/{relativePath}
    // Example: https://localhost:7253/uploads/PRJ001/documents/filename.pdf
    return `${baseUrl}/${uploadsPath}/${pdfUrl}`;
  };

  const openPdfInNewWindow = () => {
    if (!currentDocument) return;

    // Close existing PDF window if open
    if (pdfWindow && !pdfWindow.closed) {
      pdfWindow.close();
    }

    // Get the proper PDF URL
    const pdfUrl = getDocumentUrl(currentDocument);

    if (!pdfUrl) {
      console.error("No valid PDF URL found for document:", currentDocument);
      return;
    }

    console.log("Opening PDF in new window:", pdfUrl);

    // Encode the PDF URL for passing as a parameter to viewer.html
    const encodedUrl = encodeURIComponent(pdfUrl);
    const viewerUrl = `/assets/pdf-viewer/viewer.html?file=${encodedUrl}`;

    const newWindow = window.open(
      viewerUrl,
      "pdf-viewer",
      "width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=no"
    );

    if (newWindow) {
      setPdfWindow(newWindow);
      newWindow.focus();
    }
  };

  const renderDocumentSelector = () => {
    if (
      !orderSchema ||
      !orderSchema.documents ||
      !Array.isArray(orderSchema.documents) ||
      orderSchema.documents.length <= 1
    )
      return null;

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Document:
        </label>
        <select
          value={currentDocument?.id || ""}
          onChange={(e) => {
            const docId = parseInt(e.target.value);
            const doc = orderSchema.documents.find((d) => d.id === docId);
            setCurrentDocument(doc || null);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          {orderSchema.documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name} ({doc.pages} pages)
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading keying interface...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Keying Interface
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <Button
              onClick={() => fetchOrderSchema(parseInt(id!, 10))}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => navigate(`/orders/${id}`)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Order Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!orderSchema || !currentDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No schema or document available for keying
          </p>
          <Button
            onClick={() => navigate(`/orders/${id}`)}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate(`/orders/${id}`)}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order
          </Button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Keying: {orderSchema.orderIdentifier}
            </h1>
            <p className="text-sm text-gray-600">
              {orderSchema.projectName} • {orderSchema.batchName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (layoutMode === "side-by-side") {
                  setLayoutMode("full-page");
                  // Open PDF in new window when switching to full page mode
                  openPdfInNewWindow();
                } else {
                  setLayoutMode("side-by-side");
                  // Close PDF window when switching back
                  if (pdfWindow && !pdfWindow.closed) {
                    pdfWindow.close();
                    setPdfWindow(null);
                  }
                }
              }}
            >
              {layoutMode === "side-by-side" ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Sidebar className="w-4 h-4" />
              )}
              <span className="ml-2">
                {layoutMode === "side-by-side" ? "Full Page" : "Side by Side"}
              </span>
            </Button>
          </div>

          <Button
            onClick={handleSaveKeying}
            disabled={isSaving || !hasUnsavedChanges()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Keying
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {layoutMode === "side-by-side" ? (
          <>
            {/* PDF Viewer */}
            <div className="flex-1 border-r border-gray-200">
              {renderDocumentSelector()}
              <PdfViewer
                ref={pdfViewerRef}
                documentUrl={getDocumentUrl(currentDocument)}
                className="h-full"
                onDocumentLoad={(totalPages) => {
                  console.log(`PDF loaded with ${totalPages} pages`);
                }}
                onPageChange={(currentPage) => {
                  console.log(`Page changed to ${currentPage}`);
                }}
              />
            </div>

            {/* Schema Fields Sidebar */}
            <div
              className="bg-white overflow-y-auto"
              style={{
                width: `${sidebarWidth}px`,
                minWidth: "300px",
                maxWidth: "600px",
              }}
            >
              <div className="p-4">{renderSchemaFields(false)}</div>
            </div>
          </>
        ) : (
          /* Full Page Mode - PDF in separate window, schema fields take full page */
          <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-white">
            {/* Full Page Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Schema Fields - Full Page Mode
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    PDF document opened in separate window •{" "}
                    {orderSchema.schemaFields?.length || 0} fields to complete
                  </p>
                </div>

                {currentDocument && (
                  <div className="flex items-center space-x-3">
                    {renderDocumentSelector()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openPdfInNewWindow}
                      className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Reopen PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Full Page Schema Fields */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto p-6">
                {renderSchemaFields(true)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <Modal
          title="Save Confirmation"
          isOpen={true}
          onClose={() => setShowSaveConfirmation(false)}
        >
          <div className="text-center p-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Keying Saved Successfully
            </h3>
            <p className="text-gray-600">
              Your progress has been saved and can be resumed later.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrderKeyingView;
