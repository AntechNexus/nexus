import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import EditProjectModal from "../../components/dashboard/EditProjectModal";
import ProjectCard, { NewProjectCard } from "../../components/dashboard/ProjectCard";
import RecentFilesTable from "../../components/dashboard/RecentFilesTable";
import TrashProjectModal from "../../components/dashboard/TrashProjectModal";
import { projectService } from "../../services/project.service";
import { fetchRecentFiles } from "../../services/recentFilesApi";

/**
 * DashboardPage Component
 * 
 * The primary landing page for authenticated users. 
 * Responsibilities:
 * - Displays an overview of recent files and active projects.
 * - Manages notification polling (via DashboardHeader).
 * - Serves as the central hub for navigating the Nexus workspace.
 * 
 * @returns {JSX.Element} The rendered dashboard interface.
 */
const DashboardPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [trashProject, setTrashProject] = useState(null);
  const [toast, setToast] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);

  const fetchProjects = async () => {
    try {
      const res = await projectService.getProjects();
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
    }
  };

  const loadRecentFiles = async () => {
    try {
      const files = await fetchRecentFiles(10);
      setRecentFiles(files);
    } catch (err) {
      console.error("Failed to load recent files", err);
    }
  };

  useEffect(() => {
    import("../../services/auth.service").then(module => {
      module.default.getProfile().then(res => {
        setCurrentUser(res.data || res.user || res);
      }).catch(console.error);
    });

    fetchProjects();
    loadRecentFiles();
    const handleUpdate = () => {
      fetchProjects();
      loadRecentFiles();
    };
    window.addEventListener("projectListUpdated", handleUpdate);
    return () => window.removeEventListener("projectListUpdated", handleUpdate);
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
      setTrashProject(project);
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
      return { success: true };
    } catch (err) {
      console.error(err);
      setToast(err.response?.data?.message || "Failed to update project.");
      return { success: false, error: err };
    }
  };

  const handleMoveToTrash = async () => {
    if (!trashProject) return;
    try {
      await projectService.deleteProject(trashProject.id);
      setProjects((current) => current.filter((p) => p.id !== trashProject.id));
      setTrashProject(null);
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
        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 p-4 lg:p-8">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-nexus-primary" />
            <h1 className="text-3xl font-semibold tracking-tight text-nexus-text">Dashboard</h1>
          </div>

          <section>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-nexus-text">My Projects</h2>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-nexus-primary transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                onClick={() => navigate("/projects")}
                type="button"
              >
                View All <ArrowRight size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.length < 4 && (
                <NewProjectCard onClick={() => navigate("/projects/new")} />
              )}
              {projects.slice(0, 4).map((project) => (
                <ProjectCard
                  key={project.id}
                  currentUser={currentUser}
                  menuOpen={openMenuProjectId === project.id}
                  onMenuAction={handleProjectAction}
                  onNavigate={navigateToProject}
                  onSelect={setSelectedProjectId}
                  onToggleMenu={(id) => setOpenMenuProjectId(openMenuProjectId === id ? null : id)}
                  project={project}
                  selected={selectedProjectId === project.id}
                />
              ))}
            </div>
          </section>

          <RecentFilesTable files={recentFiles} />
        </main>
      </div>

      <EditProjectModal
        onClose={() => setEditingProject(null)}
        onSave={handleSaveProject}
        project={editingProject}
      />
      <TrashProjectModal
        onClose={() => setTrashProject(null)}
        onConfirm={handleMoveToTrash}
        project={trashProject}
      />
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default DashboardPage;
