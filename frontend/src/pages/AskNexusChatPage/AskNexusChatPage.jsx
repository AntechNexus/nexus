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
  Trash2,
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
  regenerateAskNexusMessage,
  deleteAskNexusConversation,
} from "../../services/askNexusApi";

/**
 * A functional component that renders markdown with a typewriter effect.
 *
 * This component wraps `react-markdown` and gradually reveals the text content character by character 
 * to simulate a typing effect. This is primarily used to display AI responses as they are conceptually 
 * "streaming" in or newly generated, enhancing the conversational feel of the interface. 
 *
 * It holds the following state:
 * - `displayedText`: A substring of the full text that grows over time.
 *
 * Side effects:
 * - Sets up a `setInterval` that incrementally appends characters to `displayedText` until it matches the full `text` prop.
 * - Cleans up the interval on unmount or when dependencies change.
 * - Bypasses the typewriter effect entirely if the `isStreaming` prop is false, instantly showing the full text.
 *
 * @param {Object} props The properties object.
 * @param {string} props.text The full markdown text to display.
 * @param {number} [props.speed=10] The interval delay in milliseconds between each character.
 * @param {boolean} [props.isStreaming=false] Whether to apply the typewriter effect or show the text instantly.
 * @returns {JSX.Element} A React component rendering the gradually revealed markdown.
 */
const TypewriterMarkdown = ({ text, speed = 10, isStreaming = false }) => {
  const [displayedText, setDisplayedText] = useState(isStreaming ? "" : text);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      return;
    }
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, currentIndex));
      currentIndex++;
      if (currentIndex > text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isStreaming, speed]);

  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>;
};
import { projectService } from "../../services/project.service";

/**
 * Component for rendering a specific Ask Nexus AI conversation thread.
 *
 * This page provides a dedicated chat interface for interacting with the Nexus AI within the context 
 * of a specific project. It fetches and displays the history of a selected conversation, allows the user 
 * to send new messages, regenerate AI responses, and view inline citations linking to source documents.
 *
 * The component maintains complex state for the chat interface:
 * - `conversation` to store the messages, metadata, and citations of the current active thread.
 * - `conversations` to list recent chats in the sidebar history.
 * - `projects` to populate the project context selector in the sidebar.
 * - `draft` for tracking the user's current input in the text area.
 * - `loading` to disable inputs and show loading indicators while waiting for the AI backend.
 * - `deleteConfirmId` to handle the display of the deletion confirmation modal.
 *
 * Side effects triggered by this component include:
 * - Fetching the specific conversation data, all user conversations, and all user projects on mount or when the `conversationId` URL parameter changes.
 * - Scrolling the chat view to the bottom automatically whenever the `conversation` state updates, ensuring the latest messages are visible.
 * - Interacting with the clipboard API to copy AI answers when requested by the user.
 * - Updating local state and navigating away when a conversation is successfully deleted.
 *
 * @returns {JSX.Element} The rendered chat layout featuring a sidebar with history, a main chat window with message bubbles and citations, and an input area.
 */
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
  const [lastResponseId, setLastResponseId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDeleteConversation = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteAskNexusConversation(deleteConfirmId);
      setToast("Conversation deleted.");
      if (deleteConfirmId === conversationId) {
        navigate("/ask-nexus", { state: { projectId: conversation?.projectId } });
      } else {
        const updatedConvs = await fetchAskNexusConversations();
        setConversations(updatedConvs);
        setDeleteConfirmId(null);
      }
    } catch (error) {
      setToast("Failed to delete: " + error.message);
      setDeleteConfirmId(null);
    }
  };

  const promptStarters = useMemo(() => fetchAskNexusPrompts().slice(2, 5), []);
  const [projects, setProjects] = useState([]);
  const projectConversations = useMemo(
    () => conversations.filter((item) => item.projectId === conversation?.projectId),
    [conversation?.projectId, conversations],
  );

  useEffect(() => {
    fetchAskNexusConversation(conversationId)
      .then(setConversation)
      .catch((err) => {
        if (err.status === 403) {
          navigate("/403");
        } else {
          console.error(err);
        }
      });
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

  const handleRegenerate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const nextConversation = await regenerateAskNexusMessage(conversationId);
      setConversation(nextConversation);
      const lastMsg = nextConversation.messages[nextConversation.messages.length - 1];
      if (lastMsg && (lastMsg.role === 'model' || lastMsg.role === 'assistant')) {
        setLastResponseId(lastMsg._id || lastMsg.id);
      }
    } catch (error) {
      setToast("Failed to regenerate message: " + error.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  };

  const sendMessage = async () => {
    const question = draft.trim();
    if (!question || loading) return;

    setLoading(true);
    try {
      const nextConversation = await appendAskNexusMessage({ conversationId, question, projectId: conversation?.projectId });
      setConversation(nextConversation);
      const lastMsg = nextConversation.messages[nextConversation.messages.length - 1];
      if (lastMsg && (lastMsg.role === 'model' || lastMsg.role === 'assistant')) {
        setLastResponseId(lastMsg._id || lastMsg.id);
      }
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
                onClick={() => navigate("/ask-nexus", { state: { projectId: conversation?.projectId } })}
                type="button"
              >
                <MessageSquare size={16} /> New Chat
              </button>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-nexus-primary">Project Context</p>
                <p className="mt-1 truncate text-sm font-bold text-nexus-text">
                  {projects.find(p => p.id === conversation?.projectId)?.title || conversation?.projectName || "Unknown Project"}
                </p>
                <p className="mt-0.5 text-xs text-nexus-muted">Current project documents only</p>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto overflow-x-hidden border-b border-nexus-border p-3">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Projects</p>
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
                          navigate("/ask-nexus", { state: { projectId: project.id } });
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Recent Chats</p>
              <div className="space-y-1">
                {projectConversations.map((item) => (
                  <div key={item._id || item.id} className="group flex w-full items-center justify-between gap-1 rounded-xl pr-2 text-left transition hover:bg-white">
                    <button
                      className={`flex flex-1 min-w-0 items-start justify-between gap-2 rounded-xl px-3 py-3 text-left transition ${
                        (item._id || item.id) === (conversation._id || conversation.id) ? "border-l-4 border-nexus-primary bg-blue-50" : ""
                      }`}
                      onClick={() => navigate(`/ask-nexus/chat/${item._id || item.id}`)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-nexus-text">{item.title}</span>
                        <span className="mt-1 block text-xs text-nexus-muted">{item.updatedLabel || "Just now"}</span>
                      </span>
                    </button>
                    <button
                      className="hidden group-hover:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:flex"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item._id || item.id); }}
                      type="button"
                      title="Delete Conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                  onClick={() => navigate("/ask-nexus", { state: { projectId: conversation?.projectId } })}
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
                {(conversation.messages || []).map((message, index) => {
                  const isUser = (message.sender || message.role) === "user";
                  const isLastMessage = index === (conversation.messages || []).length - 1;
                  const messageText = message.messageText || message.content;
                  let citations = message.citations || (message.sources || []).map((source) => ({
                    fileName: typeof source === "string" ? source : source.fileName,
                    fileId: typeof source === "string" ? null : source.fileId,
                    fileStatus: source.fileStatus || "active",
                    snippet: source.textSnippet || "",
                    timestamp: "",
                  }));

                  const seenFileNames = new Set();
                  citations = citations.filter(citation => {
                    if (seenFileNames.has(citation.fileName)) return false;
                    seenFileNames.add(citation.fileName);
                    return true;
                  });

                  const getRouteType = (fileName) => /\.(mp3|wav|m4a|ogg)$/i.test(fileName || "") ? "transcripts" : "documents";

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
                          {isUser ? messageText : <TypewriterMarkdown text={messageText} isStreaming={(message._id || message.id) === lastResponseId} />}
                        </div>
                        {!isUser && citations.length > 0 && (
                          <div className="mt-5 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sources</p>
                            <div className="flex flex-wrap gap-2">
                              {citations.map((citation) => {
                                const isDeleted = citation.fileStatus === "trash" || citation.fileStatus === "deleted";
                                return (
                                  <div className="group relative inline-flex" key={`${citation.fileId || citation.fileName}-${citation.timestamp}`}>
                                    <button
                                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold shadow-sm transition ${
                                        isDeleted 
                                          ? "border-transparent bg-slate-100 text-slate-400 cursor-not-allowed" 
                                          : "border-nexus-border bg-white text-slate-600 hover:border-nexus-primary hover:text-nexus-primary"
                                      }`}
                                      title={!isDeleted ? citation.snippet : undefined}
                                      onClick={() => (!isDeleted && citation.fileId) ? navigate(`/projects/${conversation.projectId}/${getRouteType(citation.fileName)}/${citation.fileId}`) : null}
                                      type="button"
                                      disabled={isDeleted}
                                    >
                                      <FileText size={15} /> {citation.fileName}{citation.timestamp ? ` - ${citation.timestamp}` : ""}
                                    </button>
                                    
                                    {isDeleted && (
                                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-nexus-text px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                                        File has been deleted
                                        <div className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-nexus-text"></div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!isUser && (
                          <div className="mt-5 flex items-center gap-1">
                            <button className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-nexus-primary" onClick={() => copyAnswer(messageText)} title="Copy" type="button">
                              <Copy size={17} />
                            </button>
                            {isLastMessage && (
                              <button className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-nexus-primary" onClick={handleRegenerate} title="Regenerate" type="button" disabled={loading}>
                                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                              </button>
                            )}
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

export default AskNexusChatPage;
