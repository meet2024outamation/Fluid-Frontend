import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  ArrowRight,
  Check,
  Plus,
  RefreshCw,
  AlertCircle,
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
import { clientService, type ApiClient } from "../services/clientService";
import {
  fieldMappingService,
  type Schema,
  type SchemaField,
} from "../services/fieldMappingService";

interface CSVColumn {
  name: string;
  index: number;
  sampleValues: string[];
}

interface FieldMappingData {
  id: string;
  clientId: number;
  schemaId: number;
  inputField: string;
  schemaField: SchemaField;
  confidence: number;
  isManualOverride: boolean;
}

const FieldMappingPage: React.FC = () => {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedClient, setSelectedClient] = useState<ApiClient | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMappingData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load clients and schemas in parallel
      const [clientsData, schemasData] = await Promise.all([
        clientService.getAllClients(),
        fieldMappingService.getSchemas(),
      ]);

      setClients(clientsData);
      setSchemas(schemasData.filter((schema) => schema.isActive)); // Only show active schemas
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      setCsvFile(file);
      processCSVFile(file);
    }
  };

  const processCSVFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split("\n");
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));

      const columns: CSVColumn[] = headers.map((header, index) => ({
        name: header,
        index,
        sampleValues: lines
          .slice(1, 4)
          .map((line) => {
            const values = line.split(",");
            return values[index]?.trim().replace(/"/g, "") || "";
          })
          .filter((v) => v),
      }));

      setCsvColumns(columns);
      generateInitialMappings(columns);
    } catch (error) {
      console.error("Error processing CSV:", error);
      setError("Failed to process CSV file");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateInitialMappings = (columns: CSVColumn[]) => {
    if (!selectedClient || !selectedSchema) return;

    const schemaFields = selectedSchema.schemaFields;
    const mappings: FieldMappingData[] = columns.map((column) => {
      // Simple matching logic - in production, this would be more sophisticated
      const matchingField = schemaFields.find(
        (field) =>
          field.fieldName.toLowerCase().includes(column.name.toLowerCase()) ||
          column.name.toLowerCase().includes(field.fieldName.toLowerCase()) ||
          field.fieldLabel?.toLowerCase().includes(column.name.toLowerCase())
      );

      return {
        id: `mapping_${column.index}`,
        clientId: selectedClient.id,
        schemaId: selectedSchema.id,
        inputField: column.name,
        schemaField: matchingField || schemaFields[0],
        confidence: matchingField ? 0.85 : 0.3,
        isManualOverride: false,
      };
    });

    setFieldMappings(mappings);
  };

  const updateMapping = (mappingId: string, newSchemaField: SchemaField) => {
    setFieldMappings((prev) =>
      prev.map((mapping) =>
        mapping.id === mappingId
          ? {
              ...mapping,
              schemaField: newSchemaField,
              isManualOverride: true,
              confidence: 1.0,
            }
          : mapping
      )
    );
  };

  const confirmMapping = async () => {
    if (!selectedClient || !selectedSchema) return;

    try {
      // Convert to API format
      const fieldMappingItems = fieldMappings.map((mapping) => ({
        schemaFieldId: mapping.schemaField.id,
        inputField: mapping.inputField,
        transformation: undefined, // Optional transformation
      }));

      await fieldMappingService.createBulkFieldMapping({
        clientId: selectedClient.id,
        schemaId: selectedSchema.id,
        fieldMappings: fieldMappingItems,
      });

      alert("Field mapping saved successfully!");
    } catch (error) {
      console.error("Error saving mappings:", error);
      setError("Failed to save field mappings");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.5) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading clients and schemas...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button
                onClick={loadInitialData}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </div>
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
            Map CSV columns to standardized schema fields for data processing.
          </p>
        </div>
        <Link to="/field-mapping/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Field Mapping
          </Button>
        </Link>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Client
          </CardTitle>
          <CardDescription>
            Choose the client for which you want to configure field mapping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <p>No clients available. Please add clients first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedClient?.id === client.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <h3 className="font-semibold">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">{client.code}</p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        client.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {client.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schema Selection */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Schema
            </CardTitle>
            <CardDescription>
              Choose the schema to map your CSV columns to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schemas.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <p>
                  No active schemas available. Please create a schema first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schemas.map((schema) => (
                  <div
                    key={schema.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSchema?.id === schema.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedSchema(schema)}
                  >
                    <h3 className="font-semibold">{schema.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {schema.description || "No description"}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      {schema.schemaFields?.length || 0} fields
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV Upload */}
      {selectedClient && selectedSchema && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Sample CSV
            </CardTitle>
            <CardDescription>
              Upload a sample CSV file to map its columns to your schema fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Choose CSV File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {csvFile && (
                  <span className="text-sm text-muted-foreground">
                    {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>

              {isProcessing && (
                <div className="text-sm text-muted-foreground">
                  Processing CSV file...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Mapping Table */}
      {csvColumns.length > 0 && selectedClient && selectedSchema && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Field Mapping
            </CardTitle>
            <CardDescription>
              Map each CSV column to the appropriate schema field. High
              confidence mappings are highlighted in green.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">CSV Columns</h4>
                  <div className="space-y-2">
                    {csvColumns.map((column) => (
                      <div key={column.index} className="p-3 border rounded-lg">
                        <div className="font-medium">{column.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Sample: {column.sampleValues.slice(0, 2).join(", ")}
                          {column.sampleValues.length > 2 && "..."}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Schema Fields</h4>
                  <div className="space-y-2">
                    {fieldMappings.map((mapping) => {
                      const schemaFields = selectedSchema.schemaFields;
                      return (
                        <div key={mapping.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <select
                              value={mapping.schemaField.id}
                              onChange={(e) => {
                                const field = schemaFields.find(
                                  (f) => f.id === parseInt(e.target.value)
                                );
                                if (field) updateMapping(mapping.id, field);
                              }}
                              className="flex-1 p-2 border rounded"
                            >
                              {schemaFields.map((field) => (
                                <option key={field.id} value={field.id}>
                                  {field.fieldLabel || field.fieldName} (
                                  {field.dataType})
                                </option>
                              ))}
                            </select>
                            <div
                              className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(mapping.confidence)}`}
                            >
                              {Math.round(mapping.confidence * 100)}%
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Maps to: {mapping.inputField}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-200 rounded"></div>
                    High Confidence (80%+)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                    Medium Confidence (50-79%)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-200 rounded"></div>
                    Low Confidence (&lt;50%)
                  </div>
                </div>
                <Button
                  onClick={confirmMapping}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Confirm Mapping
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Summary */}
      {fieldMappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {fieldMappings.filter((m) => m.confidence >= 0.8).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  High Confidence
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {
                    fieldMappings.filter(
                      (m) => m.confidence >= 0.5 && m.confidence < 0.8
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Medium Confidence
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {fieldMappings.filter((m) => m.confidence < 0.5).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Low Confidence
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FieldMappingPage;
