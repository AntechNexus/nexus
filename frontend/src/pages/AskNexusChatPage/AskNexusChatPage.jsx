import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Copy,
  FileText,
  Folder,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  appendAskNexusMessage,
  fetchAskNexusConversation,
  fetchAskNexusConversations,
  fetchAskNexusPrompts,
} from "../../services/askNexusApi";
import { projectService } from "../../services/project.service";

const AskNexusChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messageEndRef = useRef(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const promptStarters = useMemo(() => fetchAskNexusPrompts().slice(2, 5), []);
  const [projects, setProjects] = useState([]);
  const projectConversations = useMemo(
    () => conversations.filter((item) => item.projectId === conversation?.projectId),
    [conversation?.projectId, conversations],
  );

  useEffect(() => {
    fetchAskNexusConversation(conversationId).then(setConversation).catch(console.error);
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
    }).catch(console.error);
  }, [conversationId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation]);

  const sendMessage = async () => {
    const question = draft.trim();
    if (!question || loading) return;

    setLoading(true);
    try {
      const nextConversation = await appendAskNexusMessage({ conversationId, question, projectId: conversation?.projectId });
      setConversation(nextConversation);
      const updatedConvs = await fetchAskNexusConversations();
      setConversations(updatedConvs);
      setDraft("");
    } catch (error) {
      setToast("Failed to send message: " + error.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  };

  const copyAnswer = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setToast("Answer copied.");
    } catch {
      setToast("Copy failed. Please copy the answer manually.");
    }
  };

  if (!conversation) {
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
          <main className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6 text-center">
            <div>
              <h1 className="text-2xl font-bold text-nexus-text">Conversation not found</h1>
              <Link className="mt-4 inline-flex rounded-xl bg-nexus-primary px-4 py-2 text-sm font-bold text-white" to="/ask-nexus">
                Back to Ask Nexus
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
        <main className="grid h-[calc(100vh-64px)] overflow-hidden bg-white lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-nexus-border bg-slate-50/80 lg:flex lg:flex-col">
            <div className="border-b border-nexus-border p-4">
              <button
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-nexus-border bg-white px-4 py-2.5 text-sm font-bold text-nexus-text transition hover:bg-blue-50 hover:text-nexus-primary"
                onClick={() => navigate("/ask-nexus")}
                type="button"
              >
                <MessageSquare size={16} /> New Chat
              </button>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-nexus-primary">Project Context</p>
                <p className="mt-1 truncate text-sm font-bold text-nexus-text">
                  {projects.find(p => p.id === conversation?.projectId)?.title || conversation?.projectName || "Unknown Project"}
                </p>
                <p className="mt-0.5 text-xs text-nexus-muted">Current project documents only</p>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto border-b border-nexus-border p-3">
              <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Projects</p>
              <div className="space-y-1">
                {projects.map((project) => {
                  const active = project.id === conversation.projectId;
                  const firstConversation = conversations.find((item) => item.projectId === project.id);

                  return (
                    <button
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? "bg-blue-50 text-nexus-primary" : "text-slate-600 hover:bg-white hover:text-nexus-primary"
                      }`}
                      key={project.id}
                      onClick={() => {
                        if (firstConversation) {
                          navigate(`/ask-nexus/chat/${firstConversation._id || firstConversation.id}`);
                        } else {
                          navigate("/ask-nexus");
                        }
                      }}
                      type="button"
                    >
                      <Folder className="shrink-0" size={16} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{project.title}</span>
                        <span className="block text-xs text-nexus-muted">{project.fileCount ?? 0} files</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Recent Chats</p>
              <div className="space-y-1">
                {projectConversations.map((item) => (
                  <button
                    className={`group flex w-full items-start justify-between gap-2 rounded-xl px-3 py-3 text-left transition ${
                      (item._id || item.id) === (conversation._id || conversation.id) ? "border-l-4 border-nexus-primary bg-blue-50" : "hover:bg-white"
                    }`}
                    key={item._id || item.id}
                    onClick={() => navigate(`/ask-nexus/chat/${item._id || item.id}`)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-nexus-text">{item.title}</span>
                      <span className="mt-1 block text-xs text-nexus-muted">{item.updatedLabel || "Just now"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-white">
            <header className="flex min-h-16 items-center justify-between gap-4 border-b border-nexus-border px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-label="Back to Ask Nexus"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-nexus-primary"
                  onClick={() => navigate("/ask-nexus")}
                  type="button"
                >
                  <ArrowLeft size={19} />
                </button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nexus-primary text-white">
                  <Bot size={19} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold text-nexus-text">Ask Nexus</h1>
                  <p className="truncate text-xs font-semibold text-nexus-muted">
                    {projects.find(p => p.id === conversation?.projectId)?.title || conversation?.projectName || "Unknown Project"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-nexus-primary">BETA</span>
            </header>

            <div className="flex-1 overflow-y-auto bg-slate-50/40">
              <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
                {(conversation.messages || []).map((message) => {
                  const isUser = (message.sender || message.role) === "user";
                  const messageText = message.messageText || message.content;
                  const citations = message.citations || (message.sources || []).map((source) => ({
                    fileName: typeof source === "string" ? source : source.fileName,
                    fileId: typeof source === "string" ? null : source.fileId,
                    snippet: source.textSnippet || "",
                    timestamp: "",
                  }));

                  return (
                    <article className={`flex gap-4 ${isUser ? "justify-end" : ""}`} key={message._id || message.id}>
                      {!isUser && (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nexus-primary text-white shadow-sm">
                          <Bot size={19} />
                        </span>
                      )}
                      <div className={`min-w-0 ${isUser ? "max-w-[82%] text-right" : "flex-1"}`}>
                        {!isUser && (
                          <div className="mb-2 flex items-center gap-2">
                            <span className="font-bold text-nexus-text">NEXUS</span>
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-nexus-primary">Document-grounded answer</span>
                          </div>
                        )}
                        <div
                          className={
                            isUser
                              ? "inline-block rounded-2xl rounded-tr-none bg-blue-100 px-5 py-3 text-left text-sm leading-6 text-nexus-text"
                              : "text-sm leading-7 text-slate-700 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:mb-4 [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:mb-4 [&>ol]:pl-5 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>strong]:font-bold [&>hr]:my-4 [&>pre]:bg-slate-100 [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>code]:bg-slate-100 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded"
                          }
                        >
                          {isUser ? messageText : <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText}</ReactMarkdown>}
                        </div>
                        {!isUser && citations.length > 0 && (
                          <div className="mt-5 space-y-2">
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Sources</p>
                            <div className="flex flex-wrap gap-2">
                              {citations.map((citation) => (
                                <button
                                  className="inline-flex items-center gap-2 rounded-lg border border-nexus-border bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-nexus-primary hover:text-nexus-primary"
                                  key={`${citation.fileId || citation.fileName}-${citation.timestamp}`}
                                  title={citation.snippet}
                                  onClick={() => citation.fileId ? navigate(`/projects/${conversation.projectId}/files/${citation.fileId}`) : null}
                                  type="button"
                                >
                                  <FileText size={15} /> {citation.fileName}{citation.timestamp ? ` - ${citation.timestamp}` : ""}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {!isUser && (
                          <div className="mt-5 flex items-center gap-1">
                            <button className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-nexus-primary" onClick={() => copyAnswer(messageText)} title="Copy" type="button">
                              <Copy size={17} />
                            </button>
                            <button className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-nexus-primary" onClick={() => setToast("Regenerate is ready for backend streaming.")} title="Regenerate" type="button">
                              <RefreshCw size={17} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
                {loading && (
                  <article className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nexus-primary text-white shadow-sm">
                      <Bot size={19} />
                    </span>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-bold text-nexus-text">NEXUS</span>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-nexus-primary">Thinking...</span>
                      </div>
                      <div className="text-sm leading-7 text-slate-500 animate-pulse">
                        Scanning project documents...
                      </div>
                    </div>
                  </article>
                )}
                <div ref={messageEndRef} />
              </div>
            </div>

            <footer className="border-t border-nexus-border bg-white px-4 py-4 sm:px-6">
              <div className="mx-auto max-w-3xl">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {promptStarters.map((prompt) => (
                    <button
                      className="whitespace-nowrap rounded-xl border border-nexus-border bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-nexus-primary hover:text-nexus-primary"
                      key={prompt}
                      onClick={() => setDraft(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex overflow-hidden rounded-2xl border border-nexus-border bg-white shadow-lg focus-within:border-nexus-primary focus-within:ring-4 focus-within:ring-blue-100">
                  <textarea
                    className="max-h-40 min-h-16 flex-1 resize-none border-0 bg-transparent px-4 py-4 text-sm leading-6 outline-none overflow-y-auto"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={`Ask about ${projects.find(p => p.id === conversation?.projectId)?.title || conversation?.projectName || "Unknown Project"}...`}
                    value={draft}
                    disabled={loading}
                  />
                  <div className="flex items-end p-3">
                    <button
                      aria-label="Send message"
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-nexus-primary text-white transition hover:bg-nexus-action disabled:pointer-events-none disabled:opacity-40"
                      disabled={loading || !draft.trim()}
                      onClick={sendMessage}
                      type="button"
                    >
                      {loading ? <RefreshCw className="animate-spin" size={19} /> : <ArrowUp size={19} />}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs font-medium text-nexus-muted">
                  NEXUS AI can make mistakes. Verify important document data.
                </p>
              </div>
            </footer>
          </section>
        </main>
      </div>
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default AskNexusChatPage;
