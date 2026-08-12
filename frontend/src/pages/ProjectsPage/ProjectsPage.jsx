import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import EditProjectModal from "../../components/dashboard/EditProjectModal";
import ProjectCard, { NewProjectCard } from "../../components/dashboard/ProjectCard";
import TrashProjectModal from "../../components/dashboard/TrashProjectModal";
import { projectService } from "../../services/project.service";

const ProjectsPage = () => {
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

  useEffect(() => {
    import("../../services/auth.service").then(module => {
      module.default.getProfile().then(res => {
        setCurrentUser(res.data || res.user || res);
      }).catch(console.error);
    });

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
    
    fetchProjects();
    const interval = setInterval(fetchProjects, 15000); // Poll every 15s
    
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
    } catch (err) {
      console.error(err);
      setToast("Failed to update project.");
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
        <main className="nexus-page-shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="nexus-page-title">Projects</h1>
              <p className="mt-2 text-sm text-nexus-muted">Manage your technical document translation and archival workflows.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-nexus-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
              onClick={() => navigate("/projects/new")}
              type="button"
            >
              New Project <Plus size={16} />
            </button>
          </div>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
          </section>

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

export default ProjectsPage;
