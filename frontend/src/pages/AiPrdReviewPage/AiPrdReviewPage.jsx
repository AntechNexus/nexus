import React, { useMemo, useState, useEffect } from "react";
import {
  Check,
  CheckCircle2,
  FileText,
  History,
  RefreshCw,
  Save,
  ShieldAlert,
  X,
  Loader2,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import * as prdApi from "../../services/prdApi";

const suggestionChips = [
  "Make it more detailed",
  "Make it more concise",
  "Improve acceptance criteria",
];

const AiPrdReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { rawMarkdown, projectId, allFileIds, cacheId, questions, answers, projectName } = location.state || {};

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState("");
  const [version, setVersion] = useState("V1.0 Draft");
  const [toast, setToast] = useState("");
  
  const [currentMarkdown, setCurrentMarkdown] = useState(rawMarkdown || "");
  const [outline, setOutline] = useState([]);
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!rawMarkdown) {
      navigate("/ai-prd-workspace");
    }
  }, [rawMarkdown, navigate]);

  // Dynamically generate document outline from markdown headers
  // Also pre-process markdown to ensure headings exist if Gemini forgot them
  const processedMarkdown = useMemo(() => {
    if (!currentMarkdown) return "";
    let md = currentMarkdown;
    
    // 1. Remove ** wrapping around any line that looks like a heading
    // Some old PRDs might have "**1. Project Overview**" or "**Product Requirements Document (PRD)**"
    md = md.replace(/^\s*\*\*(.*?)\*\*\s*$/gm, "$1");

    // 2. Fix the main title
    if (!md.includes("# Product Requirements Document")) {
      // If it exists but without hash, replace it
      md = md.replace(/^Product Requirements Document \(PRD\)/mi, "# Product Requirements Document (PRD)\n");
    } else {
      // If it has # but is mixed with **, step 1 already removed **, but let's make sure it has a newline
      md = md.replace(/^#\s+Product Requirements Document \(PRD\)/mi, "# Product Requirements Document (PRD)\n");
    }
    
    // 3. Fix H2 (1. Section, 2. Section)
    // Matches "1. Project Overview", "12. Budget", etc at the start of a line, avoiding ones that already have ##
    md = md.replace(/^([0-9]+\.\s+[A-Z].+)$/gm, "\n## $1\n");
    
    // 4. Fix H3 (1.1 Section, 1.2 Section)
    md = md.replace(/^([0-9]+\.[0-9]+\s+[A-Z].+)$/gm, "\n### $1\n");

    return md;
  }, [currentMarkdown]);

  useEffect(() => {
    if (processedMarkdown) {
      const headingRegex = /^(#{1,3})\s+(.*)$/gm;
      let match;
      const newOutline = [];
      while ((match = headingRegex.exec(processedMarkdown)) !== null) {
        newOutline.push({
          id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          label: match[2].replace(/\*\*/g, '').trim(),
          level: match[1].length,
        });
      }
      setOutline(newOutline);
    }
  }, [processedMarkdown]);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleSavePrd = async () => {
    if (!processedMarkdown || !projectId) return;
    setSaveLoading(true);
    try {
      const result = await prdApi.savePrd({
        rawMarkdown: processedMarkdown,
        projectId,
        prdName: projectName ? `PRD - ${projectName}` : "Generated PRD",
        sourceFileIds: allFileIds,
      });
      setSaved(true);
      setToast("PRD saved to project files. Exported DOCX & PDF.");
      window.setTimeout(() => navigate(`/projects/${projectId}`), 1500);
    } catch (err) {
      setToast(err.message || "Failed to save PRD");
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmRegenerate = async () => {
    if (!regenInstruction.trim()) return;
    setRegenOpen(false);
    setRegenLoading(true);
    try {
      const enhancedAnswers = { ...answers, _improvement_instruction: regenInstruction };
      const aiResult = await prdApi.generatePrd(cacheId, enhancedAnswers, questions);
      setCurrentMarkdown(aiResult.prd);
      
      const vMatch = version.match(/V(\d+)\.(\d+)/);
      if (vMatch) {
        setVersion(`V${vMatch[1]}.${parseInt(vMatch[2]) + 1} Draft`);
      } else {
        setVersion("V1.1 Draft");
      }
      setToast("PRD Section Regenerated");
      setRegenInstruction("");
    } catch (err) {
      setToast(err.message || "Failed to regenerate");
    } finally {
      setRegenLoading(false);
    }
  };

  if (!rawMarkdown) return null;

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
        <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1440px] flex-col px-4 py-8 lg:px-8">
          <section className="mx-auto w-full max-w-7xl space-y-8">
            <div className="space-y-6">
              <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <button className="text-slate-400 transition hover:text-nexus-primary" onClick={() => navigate("/ai-prd-workspace")} type="button">
                  AI PRD Workspace
                </button>
                <span className="text-slate-300">&gt;</span>
                <span className="text-slate-500">{projectName || "Project"}</span>
                <span className="text-slate-300">&gt;</span>
                <span className="text-nexus-primary">Generate PRD</span>
                <span className="text-slate-300">&gt;</span>
                <span className="font-extrabold text-nexus-text">Review PRD</span>
              </nav>

              <div className="relative flex items-center justify-between px-8 sm:px-24">
                <div className="absolute left-10 right-10 top-4 h-px bg-nexus-primary" />
                {[
                  ["Upload Documents", true],
                  ["Clarify Question", true],
                  ["DOCUMENT READY", false],
                ].map(([label, complete], index) => (
                  <div className="relative z-10 flex flex-col items-center gap-2 bg-nexus-bg px-2 text-center" key={label}>
                    <span className={`flex items-center justify-center rounded-full ${index === 2 ? "h-10 w-10 border-2 border-nexus-primary bg-white ring-4 ring-blue-100" : "h-8 w-8 bg-nexus-primary text-white"}`}>
                      {complete ? <Check size={17} /> : <span className="h-3 w-3 rounded-full bg-nexus-primary" />}
                    </span>
                    <span className={`text-xs font-bold ${index === 2 ? "text-nexus-primary" : "text-nexus-primary"}`}>{label}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-nexus-border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-nexus-primary">
                      {regenLoading ? <Loader2 className="animate-spin text-nexus-primary" size={20} /> : <RefreshCw size={20} />}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-nexus-text">Nexus AI has generated your PRD. Please review the draft below.</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-nexus-muted">{version}</p>
                    </div>
                  </div>
                  <span className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-nexus-primary">
                    {version}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
              <aside className="space-y-6">
                <section>
                  <h2 className="mb-4 px-2 text-xs font-extrabold uppercase tracking-[0.16em] text-nexus-muted">Document Outline</h2>
                  <nav className="space-y-1">
                    {outline.map((item, index) => (
                      <button
                        className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-100 ${
                          index === 0 ? "border-l-2 border-nexus-primary bg-blue-50 text-nexus-primary" : "text-nexus-muted"
                        } ${item.level === 3 ? "ml-4 text-xs" : ""}`}
                        onClick={(e) => scrollToSection(e, item.id)}
                        key={`${item.id}-${index}`}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </section>
                <section className="rounded-xl border border-nexus-border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-nexus-ai">
                    <ShieldAlert size={17} />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Preview PRD</span>
                  </div>
                  <p className="text-sm leading-6 text-nexus-muted">
                    This document was synthesized from uploaded source materials, clarification answers, and system architecture notes. Please review the details carefully.
                  </p>
                </section>
              </aside>

              <section className="overflow-hidden rounded-2xl border border-nexus-border bg-white shadow-sm flex flex-col">
                
                {/* Header actions block (not floating absolute) */}
                <div className="flex justify-end p-6 border-b border-nexus-border bg-slate-50/50">
                  <div className="flex items-center gap-4 rounded-full border border-nexus-border bg-white px-5 py-2.5 shadow-sm">
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-nexus-primary px-4 py-2 text-xs font-extrabold text-white transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary disabled:opacity-50"
                      onClick={handleSavePrd}
                      disabled={saveLoading || saved || regenLoading}
                      type="button"
                    >
                      {saveLoading ? <Loader2 className="animate-spin" size={16} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                      {saved ? "Saved" : "Save PRD"}
                    </button>
                    <span className="h-5 w-px bg-nexus-border" />
                    <button
                      className="inline-flex items-center gap-2 text-xs font-bold text-nexus-text transition hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary disabled:opacity-50"
                      onClick={() => setRegenOpen(true)}
                      disabled={saveLoading || saved || regenLoading}
                      type="button"
                    >
                      <History size={16} /> Re-generate Section
                    </button>
                  </div>
                </div>

                <article className="mx-auto w-full p-8 sm:p-12">
                  <header className="border-b border-nexus-border pb-8 mb-8">
                    <div className="mb-2 flex items-center gap-2 text-nexus-primary">
                      <FileText size={19} />
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em]">Draft Product Requirement</span>
                    </div>
                  </header>

                  <div className="max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeSlug]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-4xl font-extrabold tracking-tight text-nexus-text mt-6 mb-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-nexus-text mt-10 mb-4 border-b border-nexus-border pb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold text-nexus-text mt-6 mb-3" {...props} />,
                        p: ({node, ...props}) => <p className="text-base text-slate-600 leading-8 mb-5" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-6 text-slate-600 mb-5 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 text-slate-600 mb-5 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="leading-7" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-nexus-text" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto mb-6"><table className="w-full text-left border-collapse" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border border-nexus-border bg-slate-50 px-4 py-3 font-bold text-nexus-text" {...props} />,
                        td: ({node, ...props}) => <td className="border border-nexus-border px-4 py-3 text-slate-600" {...props} />,
                      }}
                    >
                      {processedMarkdown}
                    </ReactMarkdown>
                  </div>
                </article>
              </section>
            </div>
          </section>
        </main>
      </div>

      {regenOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <section aria-modal="true" className="w-full max-w-lg rounded-2xl border border-nexus-border bg-white p-8 shadow-2xl" role="dialog">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-nexus-text">Regenerate this PRD?</h2>
                <p className="mt-2 text-sm leading-6 text-nexus-muted">
                  NEXUS will create a new PRD draft using the current uploaded documents and clarification answers.
                  Any unsaved edits in the current draft may be replaced.
                </p>
              </div>
              <button aria-label="Close regenerate modal" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setRegenOpen(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-nexus-text">What would you like NEXUS to improve?</span>
              <textarea
                className="min-h-28 w-full resize-none rounded-xl border border-nexus-border p-4 text-sm outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setRegenInstruction(event.target.value)}
                placeholder="For example: make the requirements more detailed, simplify the executive summary, or add clearer acceptance criteria."
                value={regenInstruction}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestionChips.map((chip) => (
                <button
                  className="rounded-full border border-nexus-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-nexus-primary"
                  key={chip}
                  onClick={() => setRegenInstruction(chip)}
                  type="button"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-nexus-muted transition hover:text-nexus-text"
                onClick={() => setRegenOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-nexus-primary px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-nexus-action"
                onClick={confirmRegenerate}
                type="button"
              >
                Regenerate PRD
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <DashboardToast message={toast} onClose={() => setToast("")} />}
    </div>
  );
};

export default AiPrdReviewPage;
