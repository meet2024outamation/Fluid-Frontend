import { useState, useEffect } from "react";
import { Modal } from "../components/ui/modal";
// ...existing code...
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Building2,
  Eye,
  Edit,
  Link2,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { projectService, type ApiProject } from "../services/projectService";
import { schemaService } from "../services/schemaService";
import { useTenantSelection } from "../contexts/TenantSelectionContext";

export default function ProjectManagement() {
  // ...existing code...

  // Schema assignment modal state (moved inside component)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningProjectId, setAssigningProjectId] = useState<number | null>(
    null
  );
  const [availableSchemas, setAvailableSchemas] = useState<any[]>([]);
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<number[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);

  // Open modal and load schemas
  const openAssignModal = async (projectId: number) => {
    setAssigningProjectId(projectId);
    setAssignModalOpen(true);
    setIsLoadingSchemas(true);
    try {
      // Fetch all schemas (replace with tenant/project-specific if needed)
      const schemas = await schemaService.getAllSchemas();
      setAvailableSchemas(schemas);
      // Optionally fetch already assigned schemas for this project
      const assigned = await schemaService.getSchemasByClientId(projectId);
      setSelectedSchemaIds(assigned.map((s: any) => s.id));
    } catch {
      setAvailableSchemas([]);
      setSelectedSchemaIds([]);
    } finally {
      setIsLoadingSchemas(false);
    }
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningProjectId(null);
    setAvailableSchemas([]);
    setSelectedSchemaIds([]);
  };

  const handleSchemaCheckbox = (id: number) => {
    setSelectedSchemaIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleAssignSchemas = async () => {
    if (!assigningProjectId) return;
    // Call backend API to assign schemas
    await projectService.assignSchemas({
      projectId: assigningProjectId,
      schemaIds: selectedSchemaIds,
    });
    closeAssignModal();
    // Optionally reload projects or show a success message
    loadProjects();
  };
  const { isTenantAdmin, needsTenantSelection, needsProjectSelection } =
    useTenantSelection();

  // Redirect tenant admin users to tenant selection if they haven't selected a tenant
  if (isTenantAdmin && needsTenantSelection) {
    return <Navigate to="/tenant-selection" replace />;
  }

  // Redirect if project selection is needed
  if (needsProjectSelection) {
    return <Navigate to="/project-selection" replace />;
  }

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await projectService.getAllProjects();
      // Ensure data is always an array
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setError("Failed to load projects. Please try again.");
      setProjects([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Project Management
          </h1>
          <p className="text-muted-foreground">
            Manage your projects and their configurations
          </p>
        </div>
        <Link to="/projects/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first project.
              </p>
              <Link to="/projects/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Code</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(projects) && projects.length > 0 ? (
                    projects.map((project) => (
                      <tr
                        key={project.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">{project.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-600">{project.code}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              project.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {project.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Link to={`/projects/view/${project.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="View Project"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/projects/edit/${project.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit Project"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Assign Schemas"
                              onClick={() => openAssignModal(project.id)}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            {/* Schema Assignment Modal */}
                            <Modal
                              isOpen={assignModalOpen}
                              onClose={closeAssignModal}
                              title="Assign Schemas to Project"
                            >
                              <div className="p-4">
                                {isLoadingSchemas ? (
                                  <div className="text-gray-500">
                                    Loading schemas...
                                  </div>
                                ) : (
                                  <>
                                    <div className="mb-4">
                                      <label className="block text-sm font-medium mb-2">
                                        Schemas
                                      </label>
                                      <div className="border border-gray-300 rounded-md p-2 max-h-60 overflow-auto">
                                        {availableSchemas.length === 0 && (
                                          <div className="text-gray-400 text-sm">
                                            No schemas available
                                          </div>
                                        )}
                                        {availableSchemas.map((schema: any) => (
                                          <label
                                            key={schema.id}
                                            className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={selectedSchemaIds.includes(
                                                schema.id
                                              )}
                                              onChange={() =>
                                                handleSchemaCheckbox(schema.id)
                                              }
                                              className="mr-2"
                                            />
                                            {schema.name} (v{schema.version})
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={closeAssignModal}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleAssignSchemas}
                                        disabled={
                                          selectedSchemaIds.length === 0
                                        }
                                      >
                                        Assign
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </Modal>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 px-4 text-center text-gray-500"
                      >
                        {error ? (
                          <div className="flex items-center justify-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span>{error}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Building2 className="w-5 h-5" />
                            <span>No projects found</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
