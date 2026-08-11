import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Folder,
  Home,
  Lightbulb,
  Sparkles,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import api from "../../services/api";
import { fetchProjectDocumentPreview, getProjectDocumentSummaryAI, isAudioTranscriptDocument } from "../../services/projectDetailApi";

const iconTone = {
  folder: "text-slate-600",
  pdf: "text-red-600",
  docx: "text-nexus-primary",
  xlsx: "text-emerald-600",
  mp3: "text-nexus-ai",
  m4a: "text-nexus-ai",
  prd: "text-nexus-primary",
};

const getIcon = (type) => {
  if (type === "folder") return Folder;
  if (type === "mp3" || type === "m4a") return FileAudio;
  if (type === "xlsx") return FileSpreadsheet;
  return FileText;
};



const truncateName = (name) => (name.length > 22 ? `${name.slice(0, 19)}...` : name);

const TreeItem = ({ item, items, documentId, projectId, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = getIcon(item.type);
  const active = item.id === documentId;
  const children = items.filter((child) => child.parentId === item.id);
  const hasChildren = children.length > 0;

  const content = (
    <div 
      className="flex items-center gap-2 w-full cursor-pointer" 
      style={{ paddingLeft: `${depth * 12}px` }}
      onClick={() => item.type === "folder" && setIsOpen(!isOpen)}
    >
      {item.type === "folder" && (
        <span className="text-slate-400 -mr-1">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      )}
      <Icon className={`${iconTone[item.type] || "text-slate-600"} shrink-0`} size={15} />
      <span className="truncate">{truncateName(item.name)}</span>
      {active && <span className="ml-auto h-2 w-2 rounded-full bg-nexus-primary shrink-0" />}
    </div>
  );

  return (
    <div key={item.id}>
      {item.type === "folder" ? (
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition" title={item.name}>
          {content}
        </div>
      ) : (
        <Link
          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition hover:bg-blue-50 hover:text-nexus-primary ${
            active ? "border-l-4 border-nexus-primary bg-blue-50 text-nexus-primary" : "text-slate-700"
          }`}
          title={item.name}
          to={isAudioTranscriptDocument(item) ? `/projects/${projectId}/transcripts/${item.id}` : `/projects/${projectId}/documents/${item.id}`}
        >
          {content}
        </Link>
      )}
      {hasChildren && isOpen && (
        <div className="flex flex-col mt-1 space-y-1">
          {children.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              items={items}
              documentId={documentId}
              projectId={projectId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentPreviewPage = () => {
  const { documentId, projectId } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [project, setProject] = useState({ id: projectId, title: "Loading..." });
  const [preview, setPreview] = useState(null);
  const [aiSummary, setAiSummary] = useState({ status: "Generating AI Summary...", insights: [] });

  useEffect(() => {
    api.get(`/projects/${projectId}`).then(res => {
      setProject({
        id: res.data.data._id,
        title: res.data.data.name || res.data.data.title,
      });
    }).catch(console.error);

    fetchProjectDocumentPreview(projectId, documentId).then(setPreview).catch(console.error);
    
    // Log recent access
    api.post(`/files/${documentId}/recent`).catch(err => console.error("Failed to log recent access", err));

    getProjectDocumentSummaryAI(documentId)
      .then(res => {
        if (res.success && res.summary) {
          // split by newlines and clean up bullets
          const insights = res.summary.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^[\*\-\•]\s*/, '').trim());
          setAiSummary({ status: "Ready for review", insights });
        } else {
          setAiSummary({ status: "Failed to generate summary", insights: [] });
        }
      })
      .catch(() => {
        setAiSummary({ status: "Error generating summary", insights: [] });
      });
  }, [projectId, documentId]);

  if (!preview) {
    return (
      <div className="min-h-screen bg-nexus-bg flex items-center justify-center font-sans text-nexus-text">
        <p className="text-nexus-muted">Loading preview...</p>
      </div>
    );
  }

  const document = preview.document;
  const DocumentIcon = getIcon(document?.type);
  const documentIconTone = iconTone[document?.type] || "text-slate-600";

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
        <main className="flex min-h-[calc(100vh-64px)] flex-col bg-white">
          <div className="border-b border-nexus-border px-4 py-3 lg:px-6">
            <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-nexus-primary transition hover:text-nexus-action" to={`/projects/${projectId}`}>
              <ArrowLeft size={17} /> Back to project
            </Link>
          </div>

          <section className="grid flex-1 overflow-hidden lg:grid-cols-[220px_minmax(420px,1fr)_280px]">
            <aside className="border-b border-nexus-border bg-slate-50/80 p-4 lg:border-b-0 lg:border-r">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{project.title}</p>
              <nav className="space-y-1" aria-label="Project files">
                {preview.navigationItems
                  .filter((item) => !item.parentId)
                  .map((item) => (
                    <TreeItem
                      key={item.id}
                      item={item}
                      items={preview.navigationItems}
                      documentId={document.id}
                      projectId={projectId}
                      depth={0}
                    />
                  ))}
              </nav>
            </aside>

            <article className="overflow-y-auto bg-white px-5 py-5 lg:px-8">
              <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <Home size={14} />
                <span>General</span>
                <ChevronRight size={14} />
                <Link className="font-semibold text-nexus-primary" to={`/projects/${projectId}`}>
                  {project.title}
                </Link>
                <ChevronRight size={14} />
                <span className="max-w-[260px] truncate font-medium text-nexus-text">
                  {document?.name || "Document Preview"}
                </span>
              </nav>

              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-nexus-text">Document Preview</h1>
              </div>

              <div className="max-w-4xl rounded-xl border border-nexus-border bg-white shadow-sm flex flex-col h-[750px]">
                <header className="flex items-center gap-3 border-b border-nexus-border px-5 py-4">
                  <DocumentIcon className={documentIconTone} size={18} />
                  <h2 className="font-bold text-nexus-text">{document?.name || "Document Not Found"}</h2>
                </header>
                <div className="p-0 flex-1 overflow-hidden bg-slate-50 rounded-b-xl flex flex-col relative">
                  {document?.type === 'pdf' && document?.fileUrl ? (
                    <iframe 
                      src={`${document.fileUrl}#toolbar=0`} 
                      title={document.name}
                      className="w-full h-full border-none"
                    />
                  ) : document?.content ? (
                    <div className="p-8 overflow-auto w-full h-full bg-white text-slate-800">
                      <style>{`
                        .doc-content { overflow-x: auto; width: 100%; }
                        .doc-content table { border-collapse: collapse; min-width: max-content; width: 100%; margin-bottom: 1rem; }
                        .doc-content th, .doc-content td { border: 1px solid #e2e8f0; padding: 0.75rem; white-space: nowrap; }
                        .doc-content th { background-color: #f8fafc; font-weight: 600; text-align: left; }
                        .doc-content h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
                        .doc-content h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; }
                        .doc-content h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; }
                        .doc-content p { text-align: justify; }
                      `}</style>
                      <div 
                        className="doc-content prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: document.content
                            ? document.content
                                .replace(/<p>\s*[-*]\s+(.*?)<\/p>/g, '<ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 5px; text-align: left;"><li>$1</li></ul>')
                                .replace(/<\/ul>\s*<ul[^>]*>/g, '') 
                            : ""
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-3 p-6">
                      <FileText size={48} className="text-slate-300" />
                      <p>Visual preview not available for this file type or content is empty.</p>
                    </div>
                  )}
                </div>
              </div>
            </article>

            <aside className="border-t border-nexus-border bg-white lg:border-l lg:border-t-0">
              <a href={document?.fileUrl || "#"} download={document?.name} target="_blank" rel="noreferrer" className="flex w-full items-center justify-between border-b border-nexus-border px-5 py-4 text-sm font-semibold text-nexus-text transition hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <Download size={16} /> Download
                </span>
                <ChevronRight size={16} />
              </a>
              <div className="border-b border-nexus-border px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-bold text-nexus-text">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-nexus-ai text-white">
                      <Sparkles size={15} />
                    </span>
                    AI Summary
                  </h2>
                  <button aria-label="Close AI summary" className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100" type="button">
                    <X size={17} />
                  </button>
                </div>
              </div>
              <div className="space-y-7 px-5 py-5">
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Document Status</h3>
                  <p className="text-sm font-semibold text-nexus-text">{aiSummary.status}</p>
                </section>
                <section>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Key Insights</h3>
                  <ul className="space-y-4">
                    {aiSummary.insights.length > 0 ? (
                      aiSummary.insights.map((insight, index) => (
                        <li key={index} className="flex gap-3 text-sm text-slate-600">
                          <Lightbulb className="mt-0.5 shrink-0 text-nexus-ai" size={16} />
                          <p className="leading-relaxed">{insight}</p>
                        </li>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">No insights available.</p>
                    )}
                  </ul>
                </section>
                <section className="rounded-xl bg-slate-50 p-4 text-sm">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Metadata</h3>
                  <div className="space-y-2 text-slate-700">
                    <p><span className="font-semibold">Type:</span> {document?.typeLabel || "--"}</p>
                    <p><span className="font-semibold">Modified:</span> {document?.lastModified || "--"}</p>
                    <p><span className="font-semibold">By:</span> {document?.modifiedBy || "--"}</p>
                    <p><span className="font-semibold">Size:</span> {document?.size || "--"}</p>
                  </div>
                </section>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DocumentPreviewPage;
