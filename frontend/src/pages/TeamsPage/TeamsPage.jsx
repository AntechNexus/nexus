import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  Globe2,
  MoreVertical,
  PlusCircle,
  Search,
  SortAsc,
  Trash2,
  X,
} from "lucide-react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import { NewProjectCard } from "../../components/dashboard/ProjectCard";
import { projectService } from "../../services/project.service";
import { teamService } from "../../services/team.service";

const sortOptions = [
  { label: "Project Name A-Z", value: "name-asc" },
  { label: "Project Name Z-A", value: "name-desc" },
  { label: "Most Members", value: "members-desc" },
  { label: "Fewest Members", value: "members-asc" },
  { label: "Last Updated", value: "updated-desc" },
];

const initials = (name) => {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const sortProjects = (projectList, sortMode) =>
  [...projectList].sort((firstProject, secondProject) => {
    const titleA = firstProject.title || "";
    const titleB = secondProject.title || "";
    if (sortMode === "name-desc") return titleB.localeCompare(titleA);
    if (sortMode === "members-desc") return secondProject.members.length - firstProject.members.length;
    if (sortMode === "members-asc") return firstProject.members.length - secondProject.members.length;
    if (sortMode === "updated-desc") return firstProject.updatedLabel.localeCompare(secondProject.updatedLabel);
    return titleA.localeCompare(titleB);
  });

const ProjectAvatarStack = ({ members }) => (
  <div className="flex -space-x-2">
    {members.slice(0, 3).map((member) => (
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${member.tone}`}
        key={member.id}
      >
        {initials(member.name)}
      </span>
    ))}
    {members.length > 3 && (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-bold text-slate-600">
        +{members.length - 3}
      </span>
    )}
  </div>
);

const ProjectMenu = ({ onDelete, onRename, open }) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-nexus-border bg-white py-1 text-sm shadow-xl">
      <button
        className="block w-full px-3 py-2 text-left font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary"
        onClick={onRename}
        type="button"
      >
        Rename
      </button>
      <button
        className="block w-full px-3 py-2 text-left font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </div>
  );
};

const SortMenu = ({ onSelect, open, selectedSort }) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-nexus-border bg-white py-1 text-sm shadow-xl">
      {sortOptions.map((option) => (
        <button
          className={`block w-full px-3 py-2 text-left font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary ${
            selectedSort === option.value ? "text-nexus-primary" : "text-slate-700"
          }`}
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const RenameProjectModal = ({ onClose, onSave, project }) => {
  const [name, setName] = useState(project?.title ?? "");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setName(project?.title ?? "");
    setErrors({});
  }, [project]);

  useEffect(() => {
    if (!project) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Project name cannot be empty." });
      return;
    }
    const res = await onSave(name.trim());
    if (res && res.success === false) {
      const err = res.error;
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
      } else {
        setErrors({ general: err.response?.data?.message || "Failed to rename project." });
      }
    }
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-nexus-text">Rename Project</h2>
          <button aria-label="Close rename project modal" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <label className="mb-2 block text-sm font-medium text-slate-600">
          Project Name
          <input
            className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm text-nexus-text outline-none transition focus:ring-4 focus:ring-blue-100 ${
              errors.name ? "border-red-400 focus:border-red-500" : "border-nexus-border focus:border-nexus-primary"
            }`}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((prev) => ({ ...prev, name: null }));
            }}
            value={name}
          />
        </label>
        {errors.name && <p className="mb-4 text-sm font-semibold text-red-600">{errors.name}</p>}
        {errors.general && <p className="mb-4 text-sm font-semibold text-red-600">{errors.general}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-xl px-4 py-2 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded-xl bg-nexus-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

const DeleteProjectModal = ({ onClose, onConfirm, project }) => {
  useEffect(() => {
    if (!project) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={26} />
        </div>
        <h2 className="text-xl font-semibold text-nexus-text">Delete this project?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {project.title} will be removed from your active workspace view.
        </p>
        <div className="mt-6 flex justify-stretch gap-3">
          <button className="flex-1 rounded-xl border border-nexus-border px-4 py-2.5 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2" onClick={onConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const AddMemberModal = ({ onAdd, onClose, project }) => {
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!project) return undefined;
    setSelected(null);
    setSearchQuery("");
    setSearchResults([]);
    setError("");
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await teamService.searchUsers(searchQuery);
        if (res?.data) {
          setSearchResults(res.data.filter(u => !project.members.some(m => m.id === u._id)));
        }
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, project]);

  if (!project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-nexus-border p-6">
          <h2 className="text-xl font-semibold text-nexus-text">Add members</h2>
          <button aria-label="Close add member modal" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6 p-6">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="h-12 w-full rounded-xl border border-nexus-border bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100" 
              placeholder="Search by name or email" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError("");
              }}
            />
          </label>
          {error && <p className="-mt-2 text-sm font-semibold text-red-600">{error}</p>}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-nexus-muted">Search Results</p>
            {searchResults.length === 0 && searchQuery.length >= 3 && (
              <p className="text-sm text-slate-500">No users found.</p>
            )}
            {searchResults.length === 0 && searchQuery.length < 3 && (
              <p className="text-sm text-slate-500">Type at least 3 characters to search...</p>
            )}
            {searchResults.map((user) => {
              const name = user.profile?.fullName || user.email;
              const isSelected = selected?._id === user._id;
              return (
                <div key={user._id} className="mb-2 flex items-center justify-between rounded-xl border border-nexus-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {initials(name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-nexus-text">{name}</p>
                      <p className="text-xs text-nexus-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary ${
                        isSelected ? "bg-slate-100 text-slate-700" : "bg-nexus-primary text-white hover:bg-nexus-action"
                      }`}
                      onClick={() => setSelected(isSelected ? null : user)}
                      type="button"
                    >
                      {isSelected ? "Selected" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-nexus-border bg-slate-50 p-6">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="rounded-xl bg-nexus-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-nexus-action disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
            disabled={!selected}
            onClick={async () => {
              setError("");
              const res = await onAdd(selected);
              if (res && res.success === false) {
                setError(res.error?.response?.data?.message || "Failed to add member.");
              }
            }}
            type="button"
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  );
};

const RemoveMemberModal = ({ member, onClose, onConfirm, project }) => {
  useEffect(() => {
    if (!member) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [member, onClose]);

  if (!member || !project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-8 text-center">
          <span className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-sm font-bold ${member.tone}`}>
            {initials(member.name)}
          </span>
          <h2 className="text-lg font-bold text-nexus-text">{member.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            They will lose all access to the <span className="font-semibold text-nexus-text">{project.title}</span> project documents and communication.
          </p>
        </div>
        <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
          <button className="flex-1 rounded-xl border border-nexus-border bg-white px-4 py-3 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2" onClick={onConfirm} type="button">
            Remove Member
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * TeamsPage Component
 * 
 * The workspace settings and member management interface.
 * Responsibilities:
 * - Displays all users (members, viewers, admins) within a project.
 * - Handles inviting new members via email search.
 * - Manages Role-Based Access Control (RBAC) levels (e.g., owner vs member permissions).
 * - Periodically polls (15s) for member status updates (e.g., pending to accepted).
 * 
 * @returns {JSX.Element} The rendered team management interface.
 */
const TeamsPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [openProjectIds, setOpenProjectIds] = useState([]);
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);
  const [addMemberProject, setAddMemberProject] = useState(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);
  const [renameProject, setRenameProject] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [sortMode, setSortMode] = useState("name-asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [toast, setToast] = useState("");
  const menuRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    import("../../services/auth.service").then(module => {
      module.default.getProfile().then(res => {
        setCurrentUser(res.data || res.user || res);
      }).catch(console.error);
    });
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await projectService.getProjects();
      if (res && res.data) {
        const tones = ["bg-pink-100 text-nexus-ai", "bg-emerald-100 text-emerald-700", "bg-indigo-100 text-indigo-700"];
        
        const normalized = res.data.map((p, index) => {
          const members = [];
          
          if (p.createdBy) {
            members.push({
              id: p.createdBy._id,
              name: p.createdBy.profile?.fullName || p.createdBy.email || "Project Owner",
              email: p.createdBy.email,
              role: "Project Owner",
              permission: "Owner",
              tone: "bg-blue-100 text-nexus-primary"
            });
          }

          p.members?.forEach((m, mIdx) => {
            if (m.userId && m.userId._id !== p.createdBy?._id) {
              members.push({
                id: m.userId._id,
                name: m.userId.profile?.fullName || m.userId.email || "Unknown User",
                email: m.userId.email,
                role: m.role || "editor",
                permission: "Editor",
                tone: tones[mIdx % tones.length],
                status: m.status
              });
            }
          });

          return {
            id: p._id,
            title: p.name || p.title || "Untitled Project",
            updatedLabel: new Date(p.updatedAt).toLocaleDateString(),
            iconTone: index % 2 === 0 ? "bg-blue-50 text-nexus-primary" : "bg-pink-50 text-nexus-ai",
            members
          };
        });

        setProjects(normalized);
        if (projectId && !openProjectIds.includes(projectId)) {
          setOpenProjectIds((curr) => [...curr, projectId]);
        } else if (normalized.length > 0 && openProjectIds.length === 0) {
          setOpenProjectIds([normalized[0].id]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects for teams view:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
    const handleUpdate = () => fetchProjects();
    const interval = setInterval(fetchProjects, 15000); // Poll every 15s
    window.addEventListener("projectListUpdated", handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("projectListUpdated", handleUpdate);
    };
  }, [projectId]); // re-run if URL changes

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuProjectId(null);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenuProjectId(null);
        setSortOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleProject = (projId) => {
    setOpenProjectIds((current) =>
      current.includes(projId) ? current.filter((id) => id !== projId) : [...current, projId],
    );
  };

  const visibleProjects = useMemo(() => sortProjects(projects, sortMode), [projects, sortMode]);
  const activeSortLabel = sortOptions.find((option) => option.value === sortMode)?.label ?? "Project Name A-Z";

  const handleRenameProject = async (name) => {
    if (!renameProject) return;
    try {
      await projectService.updateProject(renameProject.id, { name: name }); // Fixed title to name
      setToast("Project renamed successfully.");
      fetchProjects();
      setRenameProject(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    try {
      await projectService.deleteProject(deleteProject.id);
      setToast("Project deleted successfully.");
      fetchProjects();
    } catch (err) {
      setToast("Failed to delete project.");
    } finally {
      setDeleteProject(null);
    }
  };

  const handleAddMember = async (selectedUser) => {
    if (!addMemberProject || !selectedUser) return;
    try {
      await teamService.addProjectMember(addMemberProject.id, selectedUser._id, "editor");
      setToast("Member added successfully.");
      fetchProjects();
      setAddMemberProject(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return;
    try {
      await teamService.removeProjectMember(removeMemberTarget.project.id, removeMemberTarget.member.id);
      setToast("Member removed successfully.");
      fetchProjects();
    } catch (err) {
      setToast("Failed to remove member.");
    } finally {
      setRemoveMemberTarget(null);
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
              <h1 className="nexus-page-title">Team Management</h1>
              <p className="mt-2 text-sm text-nexus-muted sm:text-base">
                Manage member permissions and project access across your workspace.
              </p>
            </div>
            <div className="relative" ref={sortRef}>
              <button
                aria-expanded={sortOpen}
                className="inline-flex items-center gap-2 rounded-xl border border-nexus-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                onClick={() => setSortOpen((current) => !current)}
                type="button"
              >
                <SortAsc size={17} /> {activeSortLabel} <ChevronDown size={16} />
              </button>
              <SortMenu
                onSelect={(value) => {
                  setSortMode(value);
                  setSortOpen(false);
                }}
                open={sortOpen}
                selectedSort={sortMode}
              />
            </div>
          </div>

          <section className={visibleProjects.length === 0 ? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4" : "space-y-4"}>
            {visibleProjects.length === 0 ? (
              <NewProjectCard onClick={() => navigate("/projects/new")} />
            ) : visibleProjects.map((project) => {
              const isOpen = openProjectIds.includes(project.id);
              const isCurrentUserOwner = project.members.some(m => m.permission === "Owner" && m.id === currentUser?.id);
              
              return (
                <article className={`rounded-xl border border-nexus-border bg-white shadow-sm transition hover:shadow-md ${openMenuProjectId === project.id ? "" : "overflow-hidden"}`} key={project.id}>
                  <div
                    className="flex cursor-pointer flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    onClick={() => toggleProject(project.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") toggleProject(project.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${project.iconTone}`}>
                        <Globe2 size={20} />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-nexus-text">{project.title}</h2>
                        <p className="text-xs font-medium text-nexus-muted">{project.updatedLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <ProjectAvatarStack members={project.members} />
                      <div className="flex items-center gap-2">
                        {isCurrentUserOwner && (
                          <div className="relative" ref={openMenuProjectId === project.id ? menuRef : null}>
                            <button
                              aria-label={`Open project actions for ${project.title}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuProjectId((current) => (current === project.id ? null : project.id));
                              }}
                              type="button"
                            >
                              <MoreVertical size={18} />
                            </button>
                            <ProjectMenu
                              onDelete={(event) => {
                                event.stopPropagation();
                                setOpenMenuProjectId(null);
                                setDeleteProject(project);
                              }}
                              onRename={(event) => {
                                event.stopPropagation();
                                setOpenMenuProjectId(null);
                                setRenameProject(project);
                              }}
                              open={openMenuProjectId === project.id}
                            />
                          </div>
                        )}
                        <ChevronDown className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} size={20} />
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-nexus-border bg-slate-50/60 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-nexus-muted">
                          Team Members ({project.members.length})
                        </p>
                        {isCurrentUserOwner && (
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-nexus-primary transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                            onClick={() => setAddMemberProject(project)}
                            type="button"
                          >
                            <PlusCircle size={15} /> Add Member
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {project.members.map((member) => {
                          const isOwner = member.permission === "Owner";
                          return (
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-nexus-border/70 bg-white p-3 transition hover:border-blue-200" key={member.id}>
                              <div className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${member.tone}`}>
                                  {initials(member.name)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-nexus-text">{member.name}</p>
                                  <p className="truncate text-xs text-nexus-muted">
                                    {member.role}
                                    {member.status === "pending" && (
                                      <span className="ml-2 font-medium text-orange-500">(Pending)</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-4">
                                {isOwner && (
                                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-nexus-primary">
                                    Owner
                                  </span>
                                )}
                                {isCurrentUserOwner && (
                                  <button
                                    aria-label={`Remove ${member.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                    disabled={isOwner}
                                    onClick={() => setRemoveMemberTarget({ member, project })}
                                    type="button"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </main>
      </div>

      <AddMemberModal onAdd={handleAddMember} onClose={() => setAddMemberProject(null)} project={addMemberProject} />
      <RemoveMemberModal
        member={removeMemberTarget?.member}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleRemoveMember}
        project={removeMemberTarget?.project}
      />
      <RenameProjectModal onClose={() => setRenameProject(null)} onSave={handleRenameProject} project={renameProject} />
      <DeleteProjectModal onClose={() => setDeleteProject(null)} onConfirm={handleDeleteProject} project={deleteProject} />
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default TeamsPage;
