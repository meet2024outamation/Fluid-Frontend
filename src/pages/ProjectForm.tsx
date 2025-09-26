import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Modal } from "../components/ui/modal";
import {
  Save,
  RefreshCw,
  Edit,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import {
  projectService,
  type ApiProject,
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from "../services/projectService";

interface ProjectFormProps {
  isViewMode?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ isViewMode = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const projectId = id ? parseInt(id) : null;
  const isEditMode = projectId !== null && !isViewMode;
  const isCreateMode = !projectId;

  const [originalProject, setOriginalProject] = useState<ApiProject | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(isEditMode || isViewMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if ((isEditMode || isViewMode) && projectId && projectId > 0) {
      loadProject();
    }
    // eslint-disable-next-line
  }, [projectId, isEditMode, isViewMode]);

  const loadProject = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const project = await projectService.getProjectById(projectId);
      setOriginalProject(project);
      setFormData({
        name: project.name,
        code: project.code,
        isActive: project.isActive,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to load project"
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
      const createRequest: CreateProjectRequest = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        isActive: formData.isActive,
      };
      const validation = projectService.validateProject(createRequest);
      setValidationErrors(validation.errors);
      return validation.isValid;
    } else {
      const updateRequest: UpdateProjectRequest = {
        id: projectId!,
        name: formData.name.trim(),
        code: formData.code.trim(),
        isActive: formData.isActive,
      };
      const validation = projectService.validateProject(updateRequest);
      setValidationErrors(validation.errors);
      return validation.isValid;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isCreateMode) {
        const request: CreateProjectRequest = {
          name: formData.name.trim(),
          code: formData.code.trim(),
          isActive: formData.isActive,
        };
        await projectService.createProject(request);
      } else {
        const request: UpdateProjectRequest = {
          id: projectId!,
          name: formData.name.trim(),
          code: formData.code.trim(),
          isActive: formData.isActive,
        };
        await projectService.updateProject(request);
      }
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate("/projects");
      }, 2000);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : `Failed to ${isCreateMode ? "create" : "update"} project`
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
            Loading project...
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode && !originalProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Project not found
            </h3>
            <p className="text-gray-600 mb-4">
              The project you're looking for doesn't exist.
            </p>
            <Link to="/projects">
              <Button>Back to Project Management</Button>
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
              to="/projects"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Project Management
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-4">
            {isCreateMode
              ? "Create New Project"
              : isViewMode
                ? `View Project: ${originalProject?.name}`
                : `Edit Project: ${originalProject?.name}`}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isCreateMode
              ? "Add a new project to the system"
              : isViewMode
                ? "View project details and configuration"
                : "Modify project details and configuration"}
          </p>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Basic details about the project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Data Migration Project"
                    maxLength={255}
                    disabled={isViewMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The full name of the project
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      handleInputChange("code", e.target.value.toUpperCase())
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g., PROJ001"
                    maxLength={50}
                    disabled={isViewMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for the project (letters, numbers,
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
                    disabled={isViewMode}
                  />
                  <span className="text-sm font-medium">Project is active</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Inactive projects cannot be used for new batches or processing
                </p>
              </div>
            </CardContent>
          </Card>
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
          {!isViewMode && (
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {isCreateMode
                      ? "Creating Project..."
                      : "Updating Project..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isCreateMode ? "Create Project" : "Update Project"}
                  </>
                )}
              </Button>
              <Link to="/projects">
                <Button variant="outline" size="lg" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
            </div>
          )}
          {isViewMode && (
            <div className="flex items-center gap-4 pt-4 border-t">
              <Link to="/projects">
                <Button variant="outline" size="lg">
                  Back to Projects
                </Button>
              </Link>
              <Link to={`/projects/edit/${projectId}`}>
                <Button size="lg">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              </Link>
            </div>
          )}
        </div>
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title={`Project ${isCreateMode ? "Created" : "Updated"} Successfully`}
        >
          <div className="text-center p-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Success!
            </h3>
            <p className="text-gray-600 mb-4">
              The project "{formData.name}" has been{" "}
              {isCreateMode ? "created" : "updated"} successfully.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to project management...
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProjectForm;
