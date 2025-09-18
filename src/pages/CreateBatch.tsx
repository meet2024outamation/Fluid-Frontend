import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  FolderOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import type { CreateBatchFormData, BatchCreationStep } from "../types";
import { batchService } from "../services/batchService";
import { projectService, type ApiProject } from "../services/projectService";

const CreateBatch: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Project-related state
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateBatchFormData>({
    fileName: "",
    projectId: 0, // Will be set when projects are loaded
    name: "",
    description: "",
    metadataFile: null,
    documents: [],
  });

  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});

  const metadataFileRef = useRef<HTMLInputElement>(null);
  const documentsFileRef = useRef<HTMLInputElement>(null);

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      setProjectsError(null);

      try {
        const fetchedProjects = await projectService.getAllProjects();
        setProjects(fetchedProjects);

        // Set default project if available and no project is selected (only active projects)
        const activeProjects = fetchedProjects.filter(
          (project) => project.isActive
        );
        if (activeProjects.length > 0) {
          setFormData((prev) => {
            if (prev.projectId === 0) {
              return { ...prev, projectId: activeProjects[0].id };
            }
            return prev;
          });
        }
      } catch (error) {
        setProjectsError(
          error instanceof Error ? error.message : "Failed to fetch projects"
        );
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const steps: BatchCreationStep[] = [
    {
      id: 1,
      title: "Basic Information",
      description: "Enter batch details and metadata",
      isCompleted: currentStep > 1,
      isActive: currentStep === 1,
    },
    {
      id: 2,
      title: "Upload Files",
      description: "Upload metadata file and documents",
      isCompleted: currentStep > 2,
      isActive: currentStep === 2,
    },
    {
      id: 3,
      title: "Review & Submit",
      description: "Review all details before creating",
      isCompleted: submitSuccess,
      isActive: currentStep === 3,
    },
  ];

  const validateStep1 = (): boolean => {
    const errors: { [key: string]: string[] } = {};

    if (!formData.name.trim()) {
      errors.name = ["Batch name is required"];
    }

    if (formData.projectId <= 0) {
      errors.projectId = ["Please select a valid project"];
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = async (): Promise<boolean> => {
    const errors: { [key: string]: string[] } = {};

    // Validate metadata file
    if (!formData.metadataFile) {
      errors.metadataFile = ["Metadata file is required"];
    } else {
      const metadataValidation = await batchService.validateMetadataFile(
        formData.metadataFile
      );
      if (!metadataValidation.isValid && metadataValidation.errors) {
        errors.metadataFile = metadataValidation.errors;
      }
    }

    // Validate documents
    if (formData.documents.length > 0) {
      const documentsValidation = await batchService.validateDocuments(
        formData.documents
      );
      if (!documentsValidation.isValid && documentsValidation.errors) {
        errors.documents = documentsValidation.errors;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof CreateBatchFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation errors for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleMetadataFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleInputChange("metadataFile", file);
      // Always set fileName from uploaded file
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      handleInputChange("fileName", nameWithoutExtension);
    }
  };

  const handleDocumentsUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      handleInputChange("documents", [...formData.documents, ...fileArray]);
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = formData.documents.filter((_, i) => i !== index);
    handleInputChange("documents", newDocuments);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (await validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const request = {
        fileName: formData.fileName,
        projectId: formData.projectId,
        name: formData.name,
        description: formData.description || undefined,
        metadataFile: formData.metadataFile!,
        documents:
          formData.documents.length > 0 ? formData.documents : undefined,
      };

      const response = await batchService.createBatch(request);
      console.log("Batch created successfully:", response);
      setSubmitSuccess(true);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          fileName: "",
          projectId: 1,
          name: "",
          description: "",
          metadataFile: null,
          documents: [],
        });
        setCurrentStep(1);
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create batch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (submitSuccess) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Batch Created Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your batch "{formData.name}" has been created and is now
              processing.
            </p>
            <Button onClick={() => (window.location.href = "/batches")}>
              View All Batches
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Batch</h1>
        <p className="text-muted-foreground mt-2">
          Upload and process a new batch of documents for keying
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : step.isActive
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-100 border-gray-300 text-gray-500"
                }`}
              >
                {step.isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-16 h-0.5 bg-gray-200 ml-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>
            Step {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {steps[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Batch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter batch name"
                />
                {validationErrors.name && (
                  <div className="mt-1 text-sm text-red-600">
                    {validationErrors.name[0]}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    handleInputChange("projectId", parseInt(e.target.value))
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoadingProjects}
                >
                  {isLoadingProjects ? (
                    <option value={0}>Loading projects...</option>
                  ) : projectsError ? (
                    <option value={0}>Error loading projects</option>
                  ) : projects.length === 0 ? (
                    <option value={0}>No projects available</option>
                  ) : (
                    <>
                      <option value={0}>Select a project</option>
                      {projects
                        .filter((project) => project.isActive)
                        .map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name} ({project.code})
                          </option>
                        ))}
                    </>
                  )}
                </select>
                {validationErrors.projectId && (
                  <div className="mt-1 text-sm text-red-600">
                    {validationErrors.projectId[0]}
                  </div>
                )}
                {projectsError && (
                  <div className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {projectsError}
                  </div>
                )}
                {isLoadingProjects && (
                  <div className="mt-1 text-sm text-blue-600 flex items-center">
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Loading projects...
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter batch description (optional)"
                  maxLength={1000}
                />
                <div className="text-sm text-muted-foreground mt-1">
                  {formData.description.length}/1000 characters
                </div>
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Metadata File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Metadata File (CSV/Excel){" "}
                  <span className="text-red-500">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    formData.metadataFile
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                  onClick={() => metadataFileRef.current?.click()}
                >
                  <input
                    ref={metadataFileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleMetadataFileUpload}
                    className="hidden"
                  />
                  {formData.metadataFile ? (
                    <div className="flex items-center justify-center">
                      <FileCheck className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <div className="font-medium">
                          {formData.metadataFile.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(formData.metadataFile.size)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm font-medium">
                        Click to upload CSV or Excel file
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        CSV or Excel files up to 10MB
                      </div>
                    </div>
                  )}
                </div>
                {validationErrors.metadataFile && (
                  <div className="mt-2">
                    {validationErrors.metadataFile.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 flex items-center"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Documents (Optional)
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  onClick={() => documentsFileRef.current?.click()}
                >
                  <input
                    ref={documentsFileRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.tiff"
                    onChange={handleDocumentsUpload}
                    className="hidden"
                  />
                  <FolderOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm font-medium">
                    Click to upload documents
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    PDF, JPEG, PNG, TIFF files up to 50MB each
                  </div>
                </div>

                {/* Document List */}
                {formData.documents.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">
                      Uploaded Documents ({formData.documents.length})
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {formData.documents.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-gray-500 mr-2" />
                            <div>
                              <div className="text-sm font-medium">
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => removeDocument(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationErrors.documents && (
                  <div className="mt-2">
                    {validationErrors.documents.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 flex items-center"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">
                  Review Batch Details
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Batch Name
                    </div>
                    <div className="font-medium">{formData.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      File Name
                    </div>
                    <div className="font-medium">{formData.fileName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Project
                    </div>
                    <div className="font-medium">
                      {(() => {
                        const selectedProject = projects.find(
                          (c) => c.id === formData.projectId
                        );
                        return selectedProject
                          ? `${selectedProject.name} (${selectedProject.code})`
                          : `Project ID: ${formData.projectId}`;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">
                      Description
                    </div>
                    <div className="font-medium">
                      {formData.description || "No description provided"}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    Files
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <FileCheck className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm">
                        <strong>Metadata:</strong> {formData.metadataFile?.name}{" "}
                        (
                        {formData.metadataFile &&
                          formatFileSize(formData.metadataFile.size)}
                        )
                      </span>
                    </div>
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm">
                        <strong>Documents:</strong> {formData.documents.length}{" "}
                        files
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <div>
                      <div className="font-medium text-red-800">
                        Error creating batch
                      </div>
                      <div className="text-sm text-red-600 mt-1">
                        {submitError}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={isSubmitting}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Batch...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Batch
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateBatch;
