import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  FileCheck2,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import {
  fetchMyProjects,
  fetchProjectFiles,
  saveFilesToProject,
  uploadAndClarify,
} from "../../services/prdApi";
import { startClarifyJob, getActiveClarifyJob, getActiveGenerateJob } from "../../services/prdBackgroundService";

const MAX_FILES = 10;
const MAX_BYTES = 75 * 1024 * 1024; // 75 MB

const acceptedExtensions = [".mp3", ".m4a", ".pdf", ".docx", ".xlsx"];

const fileStyles = {
  audio: { Icon: FileAudio, tone: "bg-violet-50 text-violet-700", label: "Audio" },
  mp3: { Icon: FileAudio, tone: "bg-violet-50 text-violet-700", label: "MP3" },
  m4a: { Icon: FileAudio, tone: "bg-violet-50 text-violet-700", label: "M4A" },
  pdf: { Icon: FileText, tone: "bg-red-50 text-red-600", label: "PDF" },
  docx: { Icon: FileText, tone: "bg-blue-50 text-nexus-primary", label: "Word" },
  xlsx: { Icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600", label: "Excel" },
};

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileType = (name = "") => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["mp3", "m4a"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "xlsx") return "xlsx";
  return "docx";
};

const isAcceptedFile = (file) =>
  acceptedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

const LOADING_STEPS = [
  "Uploading files to your project...",
  "Saving audio transcription job...",
  "Sending documents to Nexus AI...",
  "AI is reading your documents...",
  "Generating clarifying questions...",
];

/**
 * Component representing the AI PRD Workspace Page.
 *
 * This page acts as the entry point and initial step (Upload Documents) for the AI-driven Product Requirement 
 * Document (PRD) generation wizard. It allows users to select an existing project, upload local files from their 
 * computer (e.g., PDF, DOCX, MP3, XLSX), or pick existing files already attached to the project. The files act 
 * as the contextual foundation for the AI to synthesize a PRD.
 *
 * The component manages extensive state to handle the file selection and upload process:
 * - `projects` and `selectedProjectId` to let the user pick which project context to operate in.
 * - `localFiles` and `nexusFiles` to track newly dropped files versus files already existing in the project.
 * - `dragActive` for managing the UI feedback of the drag-and-drop zone.
 * - `existingProjectFiles` and related modal states for the existing file picker.
 * - `submitting` and `loadingStep` to handle the transition into the background job submission phase.
 *
 * Side effects triggered by this component include:
 * - Fetching the user's available projects on mount.
 * - Fetching existing project files whenever the `selectedProjectId` changes.
 * - Intercepting global `prdJobCompleted` events to transition to the next step (Clarify) once the backend job successfully processes the documents.
 * - Validating file sizes, types, and counts synchronously during file selection.
 *
 * @returns {JSX.Element} The rendered workspace interface, including the project selector, drag-and-drop zone, file list, and modal for existing project files.
 */
const AiPrdWorkspacePage = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Project selection
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Files: local (File objects) vs nexus (metadata objects)
  const [localFiles, setLocalFiles] = useState([]);
  const [nexusFiles, setNexusFiles] = useState([]); // selected nexus file metadata

  // Existing project files
  const [existingProjectFiles, setExistingProjectFiles] = useState([]);
  const [existingFilesLoading, setExistingFilesLoading] = useState(false);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const totalFileCount = localFiles.length + nexusFiles.length;
  const uploadEnabled = Boolean(selectedProject);
  const nextEnabled = uploadEnabled && totalFileCount > 0 && !submitting;

  // Fetch projects on mount
  useEffect(() => {
    setProjectsLoading(true);
    fetchMyProjects()
      .then(setProjects)
      .catch(() => setToast("Failed to load projects. Please refresh."))
      .finally(() => setProjectsLoading(false));

    // Auto navigate if clarify or generate is done
    const clarifyStatus = localStorage.getItem("prd_clarify_status");
    const generateStatus = localStorage.getItem("prd_generate_status");
    
    const activeClarify = getActiveClarifyJob();
    const activeGenerate = getActiveGenerateJob();

    if (generateStatus === "done") {
      navigate("/ai-prd-workspace/review", { replace: true });
    } else if (clarifyStatus === "done" || generateStatus === "running") {
      // If generate is running, we still route them to clarify page because 
      // clarify page hosts the "Generating your PRD..." UI.
      navigate("/ai-prd-workspace/clarify", { replace: true });
    } else if (clarifyStatus === "running") {
      setSubmitting(true);
      setLoadingStep(2);
    }
  }, [navigate, setSelectedProjectId]);

  // Fetch project files when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setExistingProjectFiles([]);
      return;
    }
    setExistingFilesLoading(true);
    fetchProjectFiles(selectedProjectId)
      .then((files) =>
        setExistingProjectFiles(
          files.filter((f) => {
            const ext = f.name.split(".").pop()?.toLowerCase();
            return acceptedExtensions.includes(`.${ext}`);
          })
        )
      )
      .catch(() => setToast("Failed to load project files."))
      .finally(() => setExistingFilesLoading(false));
  }, [selectedProjectId]);

  const addLocalFiles = (fileList) => {
    if (!uploadEnabled) {
      setToast("Select a project before uploading documents.");
      return;
    }
    const incoming = Array.from(fileList || []);
    const invalid = incoming.find((f) => !isAcceptedFile(f));
    if (invalid) {
      setToast("Only MP3, M4A, PDF, DOCX, or XLSX files are allowed.");
      return;
    }
    const oversized = incoming.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setToast(`File "${oversized.name}" exceeds the 75 MB limit.`);
      return;
    }
    const next = incoming.map((f) => ({
      uid: `${f.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: f.name,
      size: formatFileSize(f.size),
      type: getFileType(f.name),
      fileObj: f,
    }));
    const afterAdd = [...localFiles, ...next];
    if (afterAdd.length + nexusFiles.length > MAX_FILES) {
      setToast(`You can select a maximum of ${MAX_FILES} files total.`);
      return;
    }
    setLocalFiles(afterAdd);
  };

  const addExistingFile = (doc) => {
    if (nexusFiles.some((f) => f.id === doc.id) || localFiles.some((f) => f.name === doc.name)) {
      setToast("That file is already selected.");
      return;
    }
    if (localFiles.length + nexusFiles.length + 1 > MAX_FILES) {
      setToast(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }
    setNexusFiles((prev) => [...prev, doc]);
    setToast("Existing project file selected.");
  };

  const removeFile = (uid, isNexus = false) => {
    if (isNexus) setNexusFiles((prev) => prev.filter((f) => f.id !== uid));
    else setLocalFiles((prev) => prev.filter((f) => f.uid !== uid));
  };

  const continueToClarify = async () => {
    if (!nextEnabled) return;
    setSubmitting(true);
    setLoadingStep(0);

    try {
      // Background service will handle upload to Nexus, download blobs if needed, upload to Gemini, 
      // calculate base version, and set localStorage. It will then fire a globalToast.
      await startClarifyJob({
        projectId: selectedProjectId,
        projectName: selectedProject.title,
        localFiles,
        nexusFiles,
      });

      // Show loading UI on this page. If the user stays, the globalToast listener will redirect them.
      // If they navigate away, they are safe because startClarifyJob runs in the background.
      setLoadingStep(2);

    } catch (err) {
      setToast(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleJobCompleted = (e) => {
      if (e.detail.actionPath && submitting && e.detail.type === "success") {
        navigate(e.detail.actionPath, { replace: true });
      } else if (e.detail.type === "error") {
        setSubmitting(false);
      }
    };
    window.addEventListener("prdJobCompleted", handleJobCompleted);
    return () => window.removeEventListener("prdJobCompleted", handleJobCompleted);
  }, [submitting, navigate]);

  const allFiles = [
    ...localFiles.map((f) => ({ ...f, isNexus: false })),
    ...nexusFiles.map((f) => ({ uid: f.id, name: f.name, size: f.size, type: f.type, isNexus: true })),
  ];

  return (
    <div className="min-h-screen bg-nexus-bg font-sans text-nexus-text">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <div className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]"}`}>
        <DashboardHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="nexus-page-shell">
          <section className="mx-auto w-full max-w-5xl space-y-9">
            <div className="text-center">
              <h1 className="nexus-page-title">
                Create New Product Requirements Document (PRD)
              </h1>
              <p className="mt-3 text-sm text-nexus-muted">
                Upload source materials for AI synthesis and contextual analysis.
              </p>
            </div>

            {/* Project selector */}
            <div className="mx-auto w-full max-w-xl">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Select Project
                </span>
                <span className="relative block">
                  <select
                    className="h-12 w-full appearance-none rounded-xl border border-nexus-border bg-white px-4 pr-10 text-sm font-semibold text-nexus-text outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                    disabled={projectsLoading}
                    onChange={(e) => { setSelectedProjectId(e.target.value); setLocalFiles([]); setNexusFiles([]); }}
                    value={selectedProjectId}
                  >
                    <option value="">
                      {projectsLoading ? "Loading projects..." : "Select an existing project"}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </span>
              </label>
              <p className="mt-2 text-xs font-medium text-nexus-muted">
                Only projects you own or are an accepted member of are shown.
              </p>
              {selectedProject && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm font-bold text-nexus-text">{selectedProject.title}</p>
                  <p className="mt-1 text-xs font-medium text-nexus-muted">
                    {selectedProject.updatedLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Step indicator */}
            <div className="relative flex items-start justify-between px-4 sm:px-14">
              <div className="absolute left-4 right-4 top-5 h-px bg-nexus-border sm:left-14 sm:right-14" />
              {[["1", "Upload Documents", true], ["2", "Clarify Requirements", false], ["3", "Review PRD", false]].map(
                ([num, label, active]) => (
                  <div className="relative z-10 flex flex-col items-center gap-2 text-center" key={num}>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                        active ? "bg-nexus-primary text-white" : "border border-nexus-border bg-white text-nexus-muted"
                      }`}
                    >
                      {num}
                    </span>
                    <span className={`text-xs font-bold ${active ? "text-nexus-primary" : "text-nexus-muted"}`}>
                      {label}
                    </span>
                  </div>
                )
              )}
            </div>

            {submitting ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-nexus-primary/30 rounded-xl bg-blue-50/50 min-h-[300px] gap-4">
                <Loader2 className="animate-spin text-nexus-primary" size={48} />
                <h3 className="text-lg font-bold text-nexus-text">Job in Progress</h3>
                <p className="text-sm text-nexus-muted max-w-md">
                  Please wait while Nexus AI processes your documents. You can safely navigate to other pages, and you will be notified when the job completes.
                </p>
              </div>
            ) : (
              <>

                {/* Drop zone */}
                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                  <div
                    className={`flex min-h-[360px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                    uploadEnabled
                      ? dragActive
                        ? "border-nexus-primary bg-blue-50"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                      : "pointer-events-none border-slate-200 bg-white/70 opacity-60"
                  }`}
                  onDragLeave={() => setDragActive(false)}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); addLocalFiles(e.dataTransfer.files); }}
                >
                  <input
                    accept={acceptedExtensions.join(",")}
                    className="sr-only"
                    multiple
                    onChange={(e) => addLocalFiles(e.target.files)}
                    ref={inputRef}
                    type="file"
                  />
                  <button
                    className="flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
                    onClick={() => inputRef.current?.click()}
                    type="button"
                  >
                    <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-nexus-primary">
                      <CloudUpload size={36} />
                    </span>
                    <span className="text-lg font-semibold text-nexus-text">
                      Drag &amp; drop your files here or click to browse
                    </span>
                    <span className="mt-2 text-sm text-nexus-muted">
                      Maximum 75 MB per file · Up to {MAX_FILES} files total
                    </span>
                  </button>
                  {!uploadEnabled && (
                    <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500">
                      <Lock size={14} /> Select a project before uploading documents.
                    </span>
                  )}
                  <div className="mt-6 flex flex-wrap justify-center gap-5 text-slate-400">
                    {Object.entries({ pdf: fileStyles.pdf, docx: fileStyles.docx, xlsx: fileStyles.xlsx, audio: fileStyles.audio }).map(
                      ([type, style]) => {
                        const Icon = style.Icon;
                        return (
                          <span className="flex flex-col items-center gap-1 text-xs font-bold uppercase tracking-[0.12em]" key={type}>
                            <Icon size={25} />
                            {style.label}
                          </span>
                        );
                      }
                    )}
                  </div>
                  </div>

                  <aside
                    className={`flex min-h-[360px] flex-col rounded-xl border transition ${
                      uploadEnabled
                        ? "border-nexus-border bg-white shadow-sm"
                        : "border-dashed border-slate-200 bg-white/70 opacity-60"
                    }`}
                  >
                    <div
                      className={`flex items-start justify-between gap-4 border-b p-5 ${
                        uploadEnabled ? "border-nexus-border" : "border-slate-200/70"
                      }`}
                    >
                      <div>
                        <h2 className="text-sm font-bold text-nexus-text">Choose Existing Files</h2>
                        <p className="mt-1 text-xs font-medium text-nexus-muted">
                          {selectedProject ? selectedProject.title : "Select a project to browse saved files."}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-nexus-primary">
                        <FileCheck2 size={14} />
                        {nexusFiles.length}
                      </span>
                    </div>

                    {!uploadEnabled ? (
                      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FileCheck2 size={24} />
                        </span>
                        <p className="text-sm font-bold text-nexus-text">No project selected</p>
                      </div>
                    ) : existingFilesLoading ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center text-nexus-muted">
                        <Loader2 className="animate-spin text-nexus-primary" size={28} />
                        <p className="text-sm font-semibold">Loading project files...</p>
                      </div>
                    ) : existingProjectFiles.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <FileCheck2 size={24} />
                        </span>
                        <p className="text-sm font-bold text-nexus-text">No compatible files yet</p>
                        <p className="mt-2 max-w-xs text-sm leading-6 text-nexus-muted">
                          This project does not have PDF, DOCX, XLSX, MP3, or M4A files available for PRD generation.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[360px] flex-1 space-y-3 overflow-y-auto p-4">
                        {existingProjectFiles.map((doc) => {
                          const type = getFileType(doc.name);
                          const style = fileStyles[type] || fileStyles.docx;
                          const Icon = style.Icon;
                          const selected = nexusFiles.some((f) => f.id === doc.id) || localFiles.some((f) => f.name === doc.name);
                          return (
                            <button
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary ${
                                selected ? "border-nexus-primary bg-blue-50" : "border-nexus-border bg-white hover:bg-slate-50"
                              }`}
                              key={doc.id}
                              onClick={() => addExistingFile(doc)}
                              type="button"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.tone}`}>
                                  <Icon size={19} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-nexus-text">{doc.name}</span>
                                  <span className="text-xs font-medium text-nexus-muted">{doc.size || "--"}</span>
                                </span>
                              </span>
                              {selected && <CheckCircle2 className="shrink-0 text-emerald-500" size={19} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </aside>
                </section>

                {/* PRD template hint */}
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700">
                  <p className="font-bold text-nexus-text">Want to use a PRD template?</p>
                  <p className="mt-1 leading-6">
                    Upload or select a file whose filename contains{" "}
                    <span className="font-bold text-nexus-primary">Template PRD</span>.
                    Nexus AI will use it as the preferred PRD structure.
                  </p>
                </div>

                {/* Source files list */}
                <section className="mt-6">
                  <div className="flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Source Files ({totalFileCount}/{MAX_FILES})
                    </h2>
                  </div>
                  <div className="space-y-3 mt-4">
                    {allFiles.map((file) => {
                      const style = fileStyles[file.type] || fileStyles.docx;
                      const Icon = style.Icon;
                      return (
                        <article
                          className="flex items-center justify-between gap-4 rounded-xl border border-nexus-border bg-white p-4 shadow-sm transition hover:shadow-md"
                          key={file.uid}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.tone}`}>
                              <Icon size={20} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center justify-between gap-4">
                                <p className="truncate text-sm font-bold text-nexus-text">{file.name}</p>
                                <span className="shrink-0 text-xs font-semibold text-nexus-muted">{file.size}</span>
                              </div>
                              {file.name.toLowerCase().includes("template prd") && (
                                <p className="mb-1 text-xs font-bold text-nexus-primary">PRD template detected</p>
                              )}
                              {file.isNexus && (
                                <p className="text-xs font-semibold text-nexus-muted uppercase tracking-wide">From Nexus</p>
                              )}
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full w-full rounded-full bg-nexus-primary" />
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <CheckCircle2 className="text-emerald-500" size={20} />
                            <button
                              aria-label={`Remove ${file.name}`}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              onClick={() => removeFile(file.uid, file.isNexus)}
                              type="button"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            <div className="flex justify-end pt-4">
              <button
                className="inline-flex items-center gap-3 rounded-xl bg-nexus-primary px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                disabled={!nextEnabled}
                onClick={continueToClarify}
                type="button"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {LOADING_STEPS[loadingStep]}
                  </>
                ) : (
                  <>Next: Analyze &amp; Clarify with AI <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </section>
        </main>
      </div>

      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default AiPrdWorkspacePage;
