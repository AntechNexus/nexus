import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import EditProjectModal from "../../components/dashboard/EditProjectModal";
import ProjectCard, { NewProjectCard } from "../../components/dashboard/ProjectCard";
import DeleteProjectModal from "../../components/dashboard/DeleteProjectModal";
import { projectService } from "../../services/project.service";

/**
 * ProjectsPage Component
 * 
 * This component acts as the primary dashboard view for users to oversee all their existing technical document translation and archival projects.
 * It serves as the main hub where users can browse their project portfolio, create new initiatives, and manage high-level details of existing ones.
 * 
 * State:
 * - `projects` (Array): Holds the complete collection of project objects fetched from the backend, transformed slightly for frontend consumption.
 * - `sidebarCollapsed`, `mobileSidebarOpen` (boolean): Manage the responsive visual state of the global navigation sidebar.
 * - `openMenuProjectId` (string | null): Tracks which specific project card currently has its contextual action menu expanded.
 * - `selectedProjectId` (string | null): Tracks which project card is currently focused or selected by the user.
 * - `editingProject` (Object | null): Stores the data of a project actively being modified in the edit modal.
 * - `trashProject` (Object | null): Stores the data of a project slated for deletion, awaiting user confirmation in the trash modal.
 * - `toast` (string): Contains the text for ephemeral notification banners signaling success or failure of user actions.
 * - `currentUser` (Object | null): Caches the authenticated user's profile information.
 * 
 * Side Effects / Behavior:
 * - Initialization: Upon mounting, it triggers asynchronous calls to retrieve the authenticated user's profile via dynamic import and fetches the list of all projects using the `projectService`.
 * - Polling Mechanism: Implements a recurring timer (`setInterval`) every 15 seconds to refetch the project list, ensuring the dashboard remains synchronized with backend changes or collaborative updates. The timer is rigorously cleared upon component unmount.
 * - Event Handlers: Exposes tailored functions (`handleProjectAction`, `handleSaveProject`, `handleMoveToTrash`) to orchestrate complex interactions bridging the UI (project cards) with the underlying service layer and modal state management.
 * 
 * Rendering:
 * - Constructs the page layout utilizing the standard `DashboardSidebar` and `DashboardHeader` components.
 * - Renders a prominent header section detailing the page title, a brief description of the platform's purpose, and a highly visible "New Project" call-to-action button.
 * - Displays a responsive CSS grid containing a dedicated `NewProjectCard` followed by a dynamically generated list of `ProjectCard` components, passing down necessary state and callback props to each.
 * - Conditionally renders modal overlays (`EditProjectModal`, `DeleteProjectModal`) if their corresponding state variables are populated, allowing safe and isolated data manipulation.
 * - Mounts a `DashboardToast` to provide immediate, non-intrusive feedback following CRUD operations.
 * 
 * @returns {JSX.Element} The rendered projects dashboard overview.
 */
const ProjectsPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
  const [toast, setToast] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    import("../../services/auth.service").then(module => {
      module.default.getProfile().then(res => {
        setCurrentUser(res.data || res.user || res);
      }).catch(console.error);
    });

    const fetchProjects = async (forceRefresh = false) => {
      try {
        setIsLoading(true);
        const res = await projectService.getProjects(forceRefresh);
        setProjects(res.data.map(p => ({
          ...p,
          id: p._id,
          title: p.name,
          description: p.description,
          members: p.members || [],
          fileCount: p.fileCount || 0,
          status: "active",
          createdBy: p.createdBy
        })));
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjects();
    const interval = setInterval(() => fetchProjects(true), 15000); // Poll every 15s bypassing cache
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const closeMenu = useCallback(() => setOpenMenuProjectId(null), []);

  const navigateToProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleProjectAction = (action, project) => {
    closeMenu();

    if (action === "open") {
      navigateToProject(project.id);
      return;
    }
    if (action === "edit") {
      setEditingProject(project);
      return;
    }
    if (action === "teams") {
      navigate(`/projects/${project.id}/teams`);
      return;
    }
    if (action === "trash") {
      setDeleteProjectTarget(project);
    }
  };

  const handleSaveProject = async (updatedProject) => {
    try {
      await projectService.updateProject(updatedProject.id, {
        name: updatedProject.title,
        description: updatedProject.description
      });
      setProjects((current) =>
        current.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
      setEditingProject(null);
      setToast("Project updated successfully.");
    } catch (err) {
      console.error(err);
      setToast("Failed to update project.");
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectTarget) return;
    try {
      await projectService.deleteProject(deleteProjectTarget.id);
      setProjects((current) => current.filter((p) => p.id !== deleteProjectTarget.id));
      setDeleteProjectTarget(null);
      setToast("Project deleted successfully.");
    } catch (err) {
      console.error(err);
      setToast("Failed to delete project.");
    }
  };

  return (
    <div className="min-h-screen bg-nexus-bg font-sans text-nexus-text">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <div className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]"}`}>
        <DashboardHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="nexus-page-shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="nexus-page-title">Projects</h1>
              <p className="mt-2 text-sm text-nexus-muted">Manage your technical document translation and archival workflows.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-nexus-primary px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
              onClick={() => navigate("/projects/new")}
              type="button"
            >
              New Project <Plus size={16} />
            </button>
          </div>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              <div className="col-span-full py-10 text-center text-sm font-medium text-slate-500">
                Loading projects...
              </div>
            ) : (
              <>
                <NewProjectCard onClick={() => navigate("/projects/new")} />
                {projects.map((project) => (
                  <ProjectCard
                key={project.id}
                currentUser={currentUser}
                menuOpen={openMenuProjectId === project.id}
                onMenuAction={handleProjectAction}
                onNavigate={navigateToProject}
                onSelect={setSelectedProjectId}
                onToggleMenu={(projectId) =>
                  setOpenMenuProjectId((current) => (current === projectId ? null : projectId))
                }
                project={project}
                selected={selectedProjectId === project.id}
              />
                ))}
              </>
            )}
          </section>

        </main>
      </div>

      <EditProjectModal
        onClose={() => setEditingProject(null)}
        onSave={handleSaveProject}
        project={editingProject}
      />
      <DeleteProjectModal
        onClose={() => setDeleteProjectTarget(null)}
        onConfirm={handleDeleteProject}
        project={deleteProjectTarget}
      />
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default ProjectsPage;
