import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FileAudio, FileSpreadsheet, FileText, Folder, MoreVertical, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import api from "../../services/api";
import {
  createProjectFolder,
  allowedDocumentExtensions,
  fetchProjectDocuments,
  isAllowedUploadFile,
  isAudioTranscriptDocument,
  removeProjectDocument,
  renameProjectDocument,
  uploadProjectDocument,
  moveProjectDocument,
} from "../../services/projectDetailApi";
import authService from "../../services/auth.service";
import MoveDocumentModal from "../../components/dashboard/MoveDocumentModal";

const fileStyles = {
  folder: { Icon: Folder, tone: "bg-blue-50 text-nexus-primary" },
  pdf: { Icon: FileText, tone: "bg-red-50 text-red-600" },
  docx: { Icon: FileText, tone: "bg-blue-50 text-nexus-primary" },
  xlsx: { Icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600" },
  mp3: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  mp4: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  m4a: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  prd: { Icon: FileText, tone: "bg-violet-50 text-violet-700" },
};

const MAX_UPLOAD_TOTAL_BYTES = 75 * 1024 * 1024;

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getUploadFileStyle = (name = "") => {
  const extension = name.split(".").pop()?.toLowerCase();
  return fileStyles[extension] || fileStyles.prd;
};

const ModalShell = ({ children, onClose, title }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-nexus-border p-6">
          <h2 className="text-xl font-semibold text-nexus-text">{title}</h2>
          <button aria-label={`Close ${title} modal`} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const AddFileModal = ({ onClose, onUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const addFiles = (files) => {
    if (!files || files.length === 0) return;
    
    const validFiles = [];
    const invalidTypeFiles = [];
    const emptyFiles = [];
    let nextTotalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    let exceedsTotalLimit = false;

    Array.from(files).forEach((file) => {
      if (!isAllowedUploadFile(file.name)) {
        invalidTypeFiles.push(file.name);
        return;
      }

      if (file.size === 0) {
        emptyFiles.push(file.name);
        return;
      }

      if (nextTotalBytes + file.size > MAX_UPLOAD_TOTAL_BYTES) {
        exceedsTotalLimit = true;
        return;
      }

      validFiles.push(file);
      nextTotalBytes += file.size;
    });

    if (invalidTypeFiles.length > 0 || exceedsTotalLimit || emptyFiles.length > 0) {
      const messages = [];
      if (invalidTypeFiles.length > 0) {
        messages.push("Unsupported file type skipped. Upload only PDF, DOCX, XLSX, MP3, M4A, WAV, or PRD files.");
      }
      if (emptyFiles.length > 0) {
        messages.push("Empty files (0 bytes) are not allowed.");
      }
      if (exceedsTotalLimit) {
        messages.push("Total upload size cannot exceed 75 MB.");
      }
      setError(messages.join(" "));
    } else {
      setError("");
    }
    
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const selectFile = (event) => addFiles(event.target.files);

  const dropFile = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClick = async () => {
    setIsUploading(true);
    setError("");
    const res = await onUpload(selectedFiles);
    if (res && res.success === false) {
      setError(res.error?.response?.data?.message || "Failed to upload one or more files.");
    }
    setIsUploading(false);
  };

  return (
    <ModalShell onClose={onClose} title="Upload Files">
      <div className="p-6">
        <input
          accept={allowedDocumentExtensions}
          className="sr-only"
          onChange={selectFile}
          ref={inputRef}
          type="file"
          multiple
        />
        <button
          className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-nexus-primary p-8 text-center transition hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropFile}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-nexus-primary">
            <UploadCloud size={25} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-nexus-text">Drag & drop files here</span>
            <span className="block text-sm text-nexus-muted">or browse files</span>
          </span>
          <span className="text-xs text-nexus-muted">Supported: PDF, DOCX, XLSX, MP3, M4A, WAV, PRD</span>
          <span className="text-xs text-nexus-muted">Maximum 75 MB total per upload</span>
        </button>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600 border border-red-200 leading-relaxed">{error}</p>}

        {selectedFiles.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {selectedFiles.map((file, index) => {
              const { Icon, tone } = getUploadFileStyle(file.name);

              return (
                <div className="grid grid-cols-[32px_minmax(0,1fr)_36px] items-center gap-3 rounded-xl bg-slate-50 p-4" key={index}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block break-words text-sm font-semibold leading-5 text-nexus-text">{file.name}</span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    aria-label={`Remove ${file.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    onClick={() => removeFile(index)}
                    type="button"
                    disabled={isUploading}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
        <button className="flex-1 rounded-xl border border-nexus-border bg-white py-2.5 text-sm font-semibold text-nexus-text hover:bg-slate-100 disabled:opacity-50" onClick={onClose} type="button" disabled={isUploading}>
          Cancel
        </button>
        <button className="flex-1 rounded-xl bg-nexus-primary py-2.5 text-sm font-semibold text-white transition hover:bg-nexus-action disabled:opacity-50 flex justify-center items-center gap-2" disabled={selectedFiles.length === 0 || isUploading} onClick={handleUploadClick} type="button">
          {isUploading ? (
            <>
              <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            "Upload Files"
          )}
        </button>
      </div>
    </ModalShell>
  );
};

const FolderModal = ({ existingNames, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a folder name.");
      return;
    }
    if (existingNames.includes(trimmedName.toLowerCase())) {
      setError("A folder or file with this name already exists.");
      return;
    }
    onCreate(trimmedName);
  };

  return (
    <ModalShell onClose={onClose} title="Create new folder">
      <form onSubmit={submit}>
        <div className="p-6">
          <label className="block text-sm font-semibold text-nexus-text">
            Folder name
            <input className={`mt-2 h-11 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 focus:ring-blue-100 ${error ? "border-red-400 focus:border-red-500" : "border-nexus-border focus:border-nexus-primary"}`} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Enter folder name" value={name} />
          </label>
          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
          <button className="flex-1 rounded-xl border border-nexus-border bg-white py-2.5 text-sm font-semibold text-nexus-text hover:bg-slate-100" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="flex-1 rounded-xl bg-nexus-primary py-2.5 text-sm font-semibold text-white hover:bg-nexus-action" type="submit">
            Create Folder
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const RenameModal = ({ item, onClose, onSave }) => {
  const [name, setName] = useState(item?.name ?? "");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    const res = await onSave(name.trim());
    if (res && res.success === false) {
      setError(res.error?.response?.data?.message || "Failed to rename.");
    }
  };

  return (
    <ModalShell onClose={onClose} title="Rename Item">
      <form onSubmit={submit}>
        <div className="p-6">
          <label className="block text-sm font-semibold text-nexus-text">
            New Name
            <input className={`mt-2 h-11 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 focus:ring-blue-100 ${error ? "border-red-400 focus:border-red-500" : "border-nexus-border focus:border-nexus-primary"}`} onChange={(event) => { setName(event.target.value); setError(""); }} value={name} />
          </label>
          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
          <button className="flex-1 rounded-xl border border-nexus-border bg-white py-2.5 text-sm font-semibold text-nexus-text hover:bg-slate-100" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="flex-1 rounded-xl bg-nexus-primary py-2.5 text-sm font-semibold text-white hover:bg-nexus-action" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const RemoveModal = ({ item, onClose, onRemove }) => (
  <ModalShell onClose={onClose} title="Remove Item">
    <div className="p-6">
      <p className="text-sm leading-6 text-slate-600">
        Are you sure you want to remove <span className="font-bold text-nexus-text">{item.name}</span>? This will remove it from the current project view.
      </p>
      {item.type === "folder" && (
        <div className="mt-4 rounded-lg bg-orange-50 p-4 border border-orange-200">
          <p className="text-sm text-orange-800 font-medium">
            Peringatan: Menghapus folder ini juga akan memindahkan seluruh file dan sub-folder di dalamnya ke dalam Trash secara permanen dari tampilan proyek.
          </p>
        </div>
      )}
    </div>
    <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
      <button className="flex-1 rounded-xl border border-nexus-border bg-white py-2.5 text-sm font-semibold text-nexus-text hover:bg-slate-100" onClick={onClose} type="button">
        Cancel
      </button>
      <button className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onClick={onRemove} type="button">
        Remove
      </button>
    </div>
  </ModalShell>
);

/**
 * ProjectDetailPage Component
 * 
 * The main workspace for a specific project.
 * Responsibilities:
 * - Displays and manages folders, documents, and PRDs associated with a project.
 * - Handles drag-and-drop file uploads and HTML5 file movement across folders.
 * - Communicates with multiple APIs (Project Detail API, Folder API, AI transcript API).
 * - Implements auto-refresh polling (15s) for collaborative updates.
 * 
 * @returns {JSX.Element} The rendered project workspace.
 */
const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [toast, setToast] = useState("");
  
  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [confirmMoveItem, setConfirmMoveItem] = useState(null);
  
  const addRef = useRef(null);
  const actionRef = useRef(null);

  const [project, setProject] = useState({
    id: projectId,
    title: "Loading...",
    description: "Loading...",
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    authService.getProfile().then(userRes => {
      setCurrentUser(userRes.data || userRes.user || userRes);
    }).catch(console.error);

    api.get(`/projects/${projectId}`).then(res => {
      setProject({
        id: res.data.data._id,
        title: res.data.data.name || res.data.data.title, // backend might use name or title
        description: res.data.data.description,
        createdBy: res.data.data.createdBy?._id || res.data.data.createdBy?.id || res.data.data.createdBy,
      });
    }).catch(console.error);

    const loadDocs = () => fetchProjectDocuments(projectId).then(setDocuments).catch(console.error);
    loadDocs();
    const interval = setInterval(loadDocs, 15000); // Poll every 15s
    
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (addRef.current && !addRef.current.contains(event.target)) setAddOpen(false);
      if (actionRef.current && !actionRef.current.contains(event.target)) {
        setActiveItem(null);
        setActionMenuPosition(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAddOpen(false);
        setActiveItem(null);
        setActionMenuPosition(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const folderPath = useMemo(() => {
    const path = [];
    let cursor = documents.find((item) => item.id === currentFolderId);
    while (cursor) {
      path.unshift(cursor);
      cursor = documents.find((item) => item.id === cursor.parentId);
    }
    return path;
  }, [currentFolderId, documents]);

  const visibleDocuments = useMemo(
    () =>
      documents
        .filter((item) => (item.parentId ?? null) === currentFolderId)
        .sort((firstItem, secondItem) => {
          if (firstItem.type === "folder" && secondItem.type !== "folder") return -1;
          if (firstItem.type !== "folder" && secondItem.type === "folder") return 1;
          return firstItem.name.localeCompare(secondItem.name);
        }),
    [currentFolderId, documents],
  );

  const existingNames = visibleDocuments.map((item) => item.name.toLowerCase());

  const refreshDocuments = (nextDocuments) => {
    setDocuments(nextDocuments);
  };

  const handleRowClick = (item) => {
    setHighlightedItemId(item.id);
  };

  const handleRowDoubleClick = (item) => {
    if (item.type === "folder") {
      setCurrentFolderId(item.id);
      setHighlightedItemId(null);
      return;
    }

    // Log this file as recently accessed
    api.post(`/files/${item.id}/recent`).catch(err => console.error(err));

    navigate(
      isAudioTranscriptDocument(item)
        ? `/projects/${projectId}/transcripts/${item.id}`
        : `/projects/${projectId}/documents/${item.id}`
    );
  };

  const createFolder = async (name) => {
    try {
      const nextDocuments = await createProjectFolder(projectId, { id: `${slugify(name)}-${Date.now()}`, name, parentId: currentFolderId });
      refreshDocuments(nextDocuments);
      setModal(null);
      setToast("Folder created successfully.");
    } catch (error) {
      setToast("Failed to create folder.");
    }
  };

  const uploadFile = async (files) => {
    if (!files || files.length === 0) return;
    try {
      // Create a function to upload a single file
      const uploadSingle = async (file) => {
        return await uploadProjectDocument(projectId, {
          id: `${slugify(file.name)}-${Date.now()}`,
          name: file.name,
          parentId: currentFolderId,
          size: formatFileSize(file.size),
          rawSize: file.size,
          fileObject: file,
        });
      };
      
      // Upload all files concurrently
      await Promise.all(files.map(uploadSingle));
      
      const nextDocuments = await fetchProjectDocuments(projectId);
      refreshDocuments(nextDocuments);
      setModal(null);
      setToast(`${files.length} file(s) uploaded successfully.`);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const renameItem = async (name) => {
    if (!activeItem) return;
    try {
      const nextDocuments = await renameProjectDocument(projectId, activeItem, name);
      refreshDocuments(nextDocuments);
      setActiveItem(null);
      setActionMenuPosition(null);
      setModal(null);
      setToast("Item renamed successfully.");
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const removeItem = async () => {
    if (!activeItem) return;
    try {
      const nextDocuments = await removeProjectDocument(projectId, activeItem);
      refreshDocuments(nextDocuments);
      if (highlightedItemId === activeItem.id) setHighlightedItemId(null);
      setActiveItem(null);
      setActionMenuPosition(null);
      setModal(null);
      setToast("Item removed successfully.");
    } catch (error) {
      setToast("Failed to remove item.");
    }
  };

  const handleMove = async (item, targetFolderId) => {
    try {
      const nextDocuments = await moveProjectDocument(projectId, item, targetFolderId);
      refreshDocuments(nextDocuments);
      setToast("Item moved successfully.");
    } catch (error) {
      setToast("Failed to move item.");
    }
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (item.type === "folder" && item.id !== draggedItem.id) {
      setDragOverFolderId(item.id);
    } else {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();
    setDragOverFolderId(null);
    if (!draggedItem || draggedItem.id === targetFolder.id) return;
    if (targetFolder.type === "folder") {
      setConfirmMoveItem({ source: draggedItem, target: targetFolder });
    }
    setDraggedItem(null);
  };

  const executeDropMove = () => {
    if (confirmMoveItem) {
      handleMove(confirmMoveItem.source, confirmMoveItem.target.id);
    }
    setConfirmMoveItem(null);
  };

  const createdById = project.createdBy?._id || project.createdBy?.id || project.createdBy;
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwner = createdById && currentUserId && String(createdById) === String(currentUserId);

  const openActionMenu = (event, item) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveItem((current) => (current?.id === item.id ? null : item));
    setActionMenuPosition((current) =>
      activeItem?.id === item.id && current
        ? null
        : {
            top: rect.bottom + 6,
            left: Math.max(12, rect.right - 160),
          },
    );
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
        <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1440px] flex-col bg-white font-sans">
          <header className="border-b border-nexus-border px-4 py-5 sm:px-8 sm:py-6">
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-nexus-muted">
              <Link className="transition hover:text-nexus-primary" to="/projects">Projects</Link>
              <ChevronRight size={14} />
              <button 
                className={`font-semibold text-nexus-text transition hover:text-nexus-primary ${dragOverFolderId === "root" ? "ring-2 ring-nexus-primary rounded px-1" : ""}`} 
                onClick={() => setCurrentFolderId(null)} 
                onDragOver={(e) => { e.preventDefault(); if (draggedItem) setDragOverFolderId("root"); }}
                onDrop={(e) => { e.preventDefault(); setDragOverFolderId(null); if (draggedItem) setConfirmMoveItem({ source: draggedItem, target: { id: null, name: "Project Root" } }); setDraggedItem(null); }}
                type="button"
              >
                {project.title}
              </button>
              {folderPath.map((folder) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight size={14} />
                  <button 
                    className={`font-semibold text-nexus-text transition hover:text-nexus-primary ${dragOverFolderId === folder.id ? "ring-2 ring-nexus-primary rounded px-1" : ""}`} 
                    onClick={() => setCurrentFolderId(folder.id)} 
                    onDragOver={(e) => { e.preventDefault(); if (draggedItem && draggedItem.id !== folder.id) setDragOverFolderId(folder.id); }}
                    onDrop={(e) => { e.preventDefault(); setDragOverFolderId(null); if (draggedItem && draggedItem.id !== folder.id) setConfirmMoveItem({ source: draggedItem, target: folder }); setDraggedItem(null); }}
                    type="button"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="nexus-page-title">{folderPath.at(-1)?.name || project.title}</h1>
                <p className="mt-1 max-w-2xl text-sm text-nexus-muted">{project.description}</p>
              </div>
              <div className="relative" ref={addRef}>
                <button className="inline-flex items-center gap-2 rounded-xl bg-nexus-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2" onClick={() => setAddOpen((current) => !current)} type="button">
                  <Plus size={18} /> Add
                </button>
                {addOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-nexus-border bg-white py-2 shadow-xl">
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50" onClick={() => { setModal("add-file"); setAddOpen(false); }} type="button">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-nexus-primary"><UploadCloud size={17} /></span>
                      <span><span className="block text-sm font-semibold text-nexus-text">Add File</span><span className="text-xs text-nexus-muted">Upload from your device</span></span>
                    </button>
                    {folderPath.length < 5 && (
                      <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50" onClick={() => { setModal("add-folder"); setAddOpen(false); }} type="button">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-nexus-ai"><Folder size={17} /></span>
                        <span><span className="block text-sm font-semibold text-nexus-text">Add New Folder</span><span className="text-xs text-nexus-muted">Create a folder in this project</span></span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="flex-1 overflow-hidden">
            {visibleDocuments.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <h2 className="nexus-page-title">Drop files here</h2>
                <p className="mt-4 text-lg text-nexus-muted">or use the '+ Add' button.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-wider text-nexus-muted">
                    <tr className="border-b border-nexus-border">
                      <th className="px-8 py-4 font-bold">Name</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Last Modified</th>
                      <th className="px-6 py-4 font-bold">Modified By</th>
                      <th className="px-6 py-4 font-bold">Size</th>
                      <th className="px-8 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border/70">
                    {visibleDocuments.map((item) => {
                      const style = fileStyles[item.type] || fileStyles.docx;
                      const Icon = style.Icon;
                      const highlighted = highlightedItemId === item.id;
                      const isDragOver = dragOverFolderId === item.id;
                      return (
                        <tr
                          className={`group cursor-pointer transition hover:bg-slate-50 ${highlighted ? "bg-blue-50/70 ring-1 ring-inset ring-blue-100" : ""} ${isDragOver ? "bg-blue-100/50 ring-2 ring-inset ring-nexus-primary" : ""} ${draggedItem?.id === item.id ? "opacity-50" : ""}`}
                          key={item.id}
                          onClick={() => handleRowClick(item)}
                          onDoubleClick={() => handleRowDoubleClick(item)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragOver={(e) => handleDragOver(e, item)}
                          onDrop={(e) => handleDrop(e, item)}
                        >
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.tone}`}>
                                <Icon size={19} />
                              </span>
                              <span className="font-semibold text-nexus-text">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-nexus-muted">{item.typeLabel}</td>
                          <td className="px-6 py-4 text-nexus-muted">{item.lastModified}</td>
                          <td className="px-6 py-4 text-nexus-muted">{item.modifiedBy}</td>
                          <td className="px-6 py-4 text-nexus-muted">{item.size}</td>
                          <td className="px-8 py-4 text-right">
                            <button aria-label={`Open actions for ${item.name}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={(event) => openActionMenu(event, item)} type="button">
                              <MoreVertical size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </main>
      </div>

      {activeItem && actionMenuPosition && (
        <div
          className="fixed z-[85] w-40 overflow-hidden rounded-xl border border-nexus-border bg-white py-1 text-left shadow-xl"
          ref={actionRef}
          style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary"
            onClick={() => {
              setActionMenuPosition(null);
              setModal("rename");
            }}
            type="button"
          >
            Rename
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary"
            onClick={() => {
              setActionMenuPosition(null);
              setModal("move");
            }}
            type="button"
          >
            Move to...
          </button>
          {isOwner && (
            <button
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
              onClick={() => {
                setActionMenuPosition(null);
                setModal("remove");
              }}
              type="button"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {modal === "add-file" && <AddFileModal onClose={() => setModal(null)} onUpload={uploadFile} />}
      {modal === "add-folder" && <FolderModal existingNames={existingNames} onClose={() => setModal(null)} onCreate={createFolder} />}
      {modal === "rename" && activeItem && <RenameModal item={activeItem} onClose={() => { setModal(null); setActiveItem(null); }} onSave={renameItem} />}
      {modal === "remove" && activeItem && <RemoveModal item={activeItem} onClose={() => { setModal(null); setActiveItem(null); }} onRemove={removeItem} />}
      {modal === "move" && activeItem && <MoveDocumentModal isOpen={true} onClose={() => { setModal(null); setActiveItem(null); }} documentToMove={activeItem} projectId={projectId} onMove={handleMove} />}
      
      {confirmMoveItem && (
        <ModalShell onClose={() => setConfirmMoveItem(null)} title="Confirm Move">
          <div className="p-6">
            <p className="text-sm font-semibold text-slate-700">Are you sure you want to move <strong>{confirmMoveItem.source.name}</strong> to <strong>{confirmMoveItem.target.name}</strong>?</p>
          </div>
          <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
            <button className="flex-1 rounded-xl border border-nexus-border bg-white py-2.5 text-sm font-semibold text-nexus-text hover:bg-slate-100" onClick={() => setConfirmMoveItem(null)} type="button">
              Cancel
            </button>
            <button className="flex-1 rounded-xl bg-nexus-primary py-2.5 text-sm font-semibold text-white hover:bg-nexus-action" onClick={executeDropMove} type="button">
              Yes, move it
            </button>
          </div>
        </ModalShell>
      )}

      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default ProjectDetailPage;
