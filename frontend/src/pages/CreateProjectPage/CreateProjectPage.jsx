import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, UserRound, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import { projectService } from "../../services/project.service";
import { teamService } from "../../services/team.service";

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  React.useEffect(() => {
    const search = async () => {
      if (memberQuery.trim().length > 1) {
        try {
          const res = await teamService.searchUsers(memberQuery);
          // Filter out users that are already in the members array
          const available = res.data.filter((u) => !members.some((m) => m._id === u._id));
          setSearchResults(available);
        } catch (err) {
          console.error("Failed to search users:", err);
        }
      } else {
        setSearchResults([]);
      }
    };
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [memberQuery, members]);

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      setErrors({ name: "Project name is required." });
      return;
    }

    setErrors({});

    try {
      const res = await projectService.createProject({
        name: projectName,
        description: description,
      });
      const newProjectId = res.data._id || res.data.project?._id || res.data._id;

      for (const member of members) {
        await teamService.addProjectMember(newProjectId, member._id, member.role || "editor");
      }

      setToast("Project created successfully.");
      setTimeout(() => navigate(`/projects`), 1000);
    } catch (err) {
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
      } else {
        setErrors({ general: err.response?.data?.message || "Failed to create project." });
      }
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
          <div className="mx-auto w-full max-w-3xl text-center">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <Link className="transition hover:text-nexus-primary" to="/projects">Projects</Link>
              <ChevronRight size={14} />
              <span className="text-nexus-text">Create New Project</span>
            </div>
            <h1 className="nexus-page-title">Create New Project</h1>
            <p className="mt-3 text-sm text-slate-500">Add the basic information needed to create your project workspace.</p>
          </div>

          <section className="mx-auto mt-10 w-full max-w-3xl rounded-xl border border-nexus-border bg-white p-6 shadow-sm sm:p-8">
            <form
              className="space-y-7"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveProject();
              }}
            >
              <label className="block">
                <span className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-nexus-text">
                  Project Name
                </span>
                <input
                  className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 focus:ring-blue-100 ${
                    errors.name ? "border-red-400 focus:border-red-500" : "border-nexus-border focus:border-nexus-primary"
                  }`}
                  onChange={(event) => {
                    setProjectName(event.target.value);
                    setErrors((prev) => ({ ...prev, name: null }));
                  }}
                  placeholder="Enter a unique project name"
                  type="text"
                  value={projectName}
                />
                {errors.name && <p className="mt-2 text-xs font-semibold text-red-600">{errors.name}</p>}
                {errors.general && <p className="mt-2 text-xs font-semibold text-red-600">{errors.general}</p>}
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-nexus-text">Description <span className="font-medium text-slate-500">(Optional)</span></span>
                <textarea
                  className={`min-h-32 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-blue-100 ${
                    errors.description ? "border-red-400 focus:border-red-500" : "border-nexus-border focus:border-nexus-primary"
                  }`}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setErrors((prev) => ({ ...prev, description: null }));
                  }}
                  placeholder="Add a brief description of the project goals..."
                  value={description}
                />
                {errors.description && <p className="mt-2 text-xs font-semibold text-red-600">{errors.description}</p>}
              </label>

              <div>
                <p className="mb-2 text-xs font-bold text-nexus-text">Add Team Members</p>
                <div className="relative">
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-nexus-border px-4 focus-within:border-nexus-primary focus-within:ring-4 focus-within:ring-blue-100">
                    <Search className="text-slate-400" size={17} />
                    <input
                      className="w-full text-sm outline-none"
                      onChange={(event) => {
                        setMemberQuery(event.target.value);
                        setSuggestionsOpen(true);
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
                      placeholder="Search by name or email..."
                      type="text"
                      value={memberQuery}
                    />
                    <button aria-label="Toggle member suggestions" className="rounded-lg bg-slate-100 p-1.5 text-slate-500" onClick={() => setSuggestionsOpen((current) => !current)} type="button">
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  {suggestionsOpen && searchResults.length > 0 && (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-nexus-border bg-white shadow-lg">
                      {searchResults.map((member) => (
                        <button
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50"
                          key={member._id}
                          onClick={() => {
                            setMembers([...members, { ...member, role: "editor" }]);
                            setMemberQuery("");
                            setSuggestionsOpen(false);
                          }}
                          type="button"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-nexus-primary">
                            <UserRound size={15} />
                          </span>
                          <span>
                            <span className="block font-semibold text-nexus-text">{member.profile?.fullName || member.email}</span>
                            <span className="text-xs text-slate-500">{member.profile?.roleTitle || "User"}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {members.map((member) => (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-nexus-border bg-slate-50 px-3 py-2 text-xs font-semibold text-nexus-text" key={member._id}>
                      {member.profile?.fullName || member.email} <span className="font-medium text-slate-500">({member.role})</span>
                      <button aria-label="Remove member" className="text-slate-400 hover:text-red-600" onClick={() => setMembers(members.filter(m => m._id !== member._id))} type="button">
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-nexus-border pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-600 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                    onClick={() => navigate("/projects")}
                    type="button"
                  >
                    Cancel Project
                  </button>
                  <button className="rounded-xl bg-nexus-primary px-8 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2" type="submit">
                    Save Project
                  </button>
                </div>
              </div>
            </form>
          </section>
        </main>
      </div>
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default CreateProjectPage;
