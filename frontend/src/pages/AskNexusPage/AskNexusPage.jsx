import React, { useEffect, useMemo, useState } from "react";
import { ArrowUp, Bot, FileText, ListChecks, MessageSquare, ShieldCheck, Users, Loader2, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import ProjectCard from "../../components/dashboard/ProjectCard";
import { askNexus, fetchAskNexusConversations, fetchAskNexusPrompts, deleteAskNexusConversation } from "../../services/askNexusApi";
import { projectService } from "../../services/project.service";

// Fallback removed to show empty state when no projects exist
const promptIcons = [FileText, ListChecks, Users];

/**
 * AskNexusPage Component
 * 
 * The main interface for the Ask Nexus AI Copilot.
 * Responsibilities:
 * - Provides a chat-like interface to query AI about project context.
 * - Handles conversation history selection and creation.
 * - Displays AI responses with inline citations (source documents).
 * - Integrates deeply with Retrieval-Augmented Generation (RAG) backend endpoints.
 * 
 * @returns {JSX.Element} The rendered AI chat copilot interface.
 */
const AskNexusPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProjectId = location.state?.projectId || "";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [_projects, set_Projects] = useState([]);
  const [question, setQuestion] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedProject = projects.find((project) => project._id === selectedProjectId || project.id === selectedProjectId) || projects[0];
  const canAsk = Boolean(selectedProject && question.trim() && !isSubmitting);

  useEffect(() => {
    setPrompts(fetchAskNexusPrompts());
    fetchAskNexusConversations().then(setConversations).catch(console.error);
    projectService.getProjects().then(res => {
      const projectsData = res.data || res;
      const mapped = projectsData.map(p => ({
        ...p,
        id: p._id,
        title: p.name,
        fileCount: p.fileCount || 0,
      }));
      setProjects(mapped);
      if (initialProjectId && mapped.some(p => (p._id || p.id) === initialProjectId)) {
        setSelectedProjectId(initialProjectId);
      } else {
        setSelectedProjectId(mapped[0]?.id || "");
      }
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const submitQuestion = async () => {
    if (!canAsk) return;
    setIsSubmitting(true);
    try {
      const result = await askNexus({
        projectId: selectedProject._id || selectedProject.id,
        projectName: selectedProject.title || selectedProject.name,
        question: question.trim(),
        scope: "project",
      });
      navigate(`/ask-nexus/chat/${result.conversationId}`);
    } catch (error) {
      setToast("Failed to ask question: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handleProjectAction = (action, project) => {
    setOpenMenuProjectId(null);
    if (action === "open") navigate(`/projects/${project.id}`);
    if (action === "teams") navigate(`/projects/${project.id}/teams`);
    if (action === "edit") setToast("Project editing stays available from Projects for now.");
    if (action === "trash") setToast("Project deletion stays available from Projects for now.");
  };

  const handleDeleteConversation = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteAskNexusConversation(deleteConfirmId);
      setToast("Conversation deleted.");
      const updatedConvs = await fetchAskNexusConversations();
      setConversations(updatedConvs);
      setDeleteConfirmId(null);
    } catch (error) {
      setToast("Failed to delete: " + error.message);
      setDeleteConfirmId(null);
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
          <section className="mx-auto w-full max-w-6xl space-y-7">
            <div className="max-w-3xl">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-nexus-primary">
                <Bot size={26} />
              </span>
              <h1 className="nexus-page-title">
                Ask Nexus
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-nexus-muted">
                Ask questions using documents from the selected project. Preset questions are configured by the frontend team and can later be supplied by the AI endpoint.
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-nexus-muted">
                  <Loader2 className="animate-spin text-nexus-primary" size={40} />
                  <p className="font-semibold">Loading projects...</p>
                </div>
              </div>
            ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="space-y-5">
                <div className="rounded-2xl border border-nexus-border bg-white p-5 shadow-sm">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Target Project
                    </span>
                    <select
                      className="h-12 w-full rounded-xl border border-nexus-border bg-white px-4 text-sm font-semibold text-nexus-text outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:bg-slate-50"
                      onChange={(event) => setSelectedProjectId(event.target.value)}
                      value={selectedProjectId}
                      disabled={projects.length === 0}
                    >
                      {projects.length === 0 ? (
                        <option value="" disabled>No projects available</option>
                      ) : (
                        projects.map((project) => (
                          <option key={project._id || project.id} value={project._id || project.id}>
                              {project.name || project.title}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>

                <div className={`flex overflow-hidden rounded-2xl border-2 border-nexus-border bg-white shadow-lg transition ${projects.length > 0 ? "focus-within:border-nexus-primary focus-within:ring-4 focus-within:ring-blue-100" : "opacity-60 bg-slate-50"}`}>
                  <div className="flex min-h-[220px] max-h-[260px] flex-1 flex-col">
                  <textarea
                    className="min-h-0 flex-1 resize-none border-0 bg-transparent px-5 py-5 text-base leading-7 outline-none sm:px-6 disabled:cursor-not-allowed"
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submitQuestion();
                    }}
                    placeholder={projects.length === 0 ? "Create a project first to ask NEXUS..." : "Ask NEXUS about your project documents..."}
                    value={question}
                    disabled={projects.length === 0}
                  />
                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-nexus-border bg-white px-4 py-3 sm:px-5">
                    <span className="max-w-[calc(100%-4rem)] truncate rounded-full border border-nexus-border bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Context: <span className="text-nexus-primary">{selectedProject?.name || selectedProject?.title || "None"}</span>
                    </span>
                    <button
                      aria-label="Send question to NEXUS"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nexus-primary text-white shadow-md transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40"
                      disabled={!canAsk}
                      onClick={submitQuestion}
                      type="button"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ArrowUp size={20} />}
                    </button>
                  </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {prompts.slice(0, 3).map((prompt, index) => {
                    const Icon = promptIcons[index] || FileText;
                    return (
                    <button
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-nexus-border bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary disabled:opacity-50 disabled:pointer-events-none"
                      key={prompt}
                      onClick={() => setQuestion(prompt)}
                      type="button"
                      disabled={projects.length === 0}
                    >
                      <Icon className="shrink-0" size={15} /> <span className="truncate">{prompt}</span>
                    </button>
                    );
                  })}
                </div>

              </section>

              <aside className="space-y-5">
                {selectedProject ? (
                  <ProjectCard
                    menuOpen={openMenuProjectId === selectedProject.id}
                    onMenuAction={handleProjectAction}
                    onNavigate={(projectId) => navigate(`/projects/${projectId}`)}
                    onSelect={setSelectedCardId}
                    onToggleMenu={(projectId) => setOpenMenuProjectId((current) => (current === projectId ? null : projectId))}
                    project={selectedProject}
                    selected={selectedCardId === selectedProject.id}
                  />
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <FileText className="mb-3 text-slate-300" size={32} />
                    <p className="text-sm font-semibold text-slate-500">No project selected</p>
                    <p className="mt-1 text-xs text-slate-400">Please create a project first</p>
                  </div>
                )}

                <section className="rounded-2xl border border-nexus-border bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recent Conversations</h2>
                  <div className="space-y-1">
                    {conversations.length === 0 ? (
                      <p className="py-2 text-sm text-slate-400">No recent conversations.</p>
                    ) : (
                      conversations.slice(0, 5).map((conversation) => (
                        <div key={conversation._id || conversation.id} className="group flex w-full items-center justify-between gap-1 rounded-xl pr-2 text-left transition hover:bg-slate-50">
                          <button
                            className="flex flex-1 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                            onClick={() => navigate(`/ask-nexus/chat/${conversation._id || conversation.id}`)}
                            type="button"
                          >
                            <MessageSquare className="shrink-0" size={17} /> 
                            <span className="truncate">{conversation.title}</span>
                          </button>
                          <button
                            className="hidden group-hover:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:flex"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conversation._id || conversation.id); }}
                            type="button"
                            title="Delete Conversation"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex gap-3">
                    <ShieldCheck className="shrink-0 text-nexus-primary" size={22} />
                    <div>
                      <h2 className="text-sm font-semibold text-nexus-text">Privacy Notice</h2>
                      <p className="mt-1 text-sm leading-6 text-nexus-muted">
                        NEXUS only uses documents you have permission to access.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
            )}
          </section>
        </main>
      </div>
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-nexus-text">Delete Chat</h2>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={() => setDeleteConfirmId(null)} type="button">Cancel</button>
              <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" onClick={handleDeleteConversation} type="button">Delete</button>
            </div>
          </div>
        </div>
      )}
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default AskNexusPage;
