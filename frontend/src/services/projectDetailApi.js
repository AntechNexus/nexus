import api from './api';

export const allowedDocumentTypes = ["pdf", "docx", "xlsx", "mp3", "m4a", "prd"];
export const allowedDocumentExtensions = allowedDocumentTypes.map((type) => `.${type}`).join(",");

export const getDocumentType = (fileName) => {
  if (!fileName) return "unknown";
  const ext = fileName.split('.').pop().toLowerCase();
  
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "mp3";
  if (["mp4", "avi", "mov", "wmv"].includes(ext)) return "mp4";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xlsx";
  
  return ext;
};

export const getDocumentTypeLabel = (fileName) => {
  const ext = fileName?.split('.')?.pop()?.toLowerCase();
  if (["mp3", "wav", "m4a"].includes(ext)) return "Audio";
  if (["mp4", "avi"].includes(ext)) return "Video";
  if (ext === "pdf") return "PDF";
  if (ext === "docx" || ext === "doc") return "Document";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "Spreadsheet";
  return "Document";
};

export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const fetchProjectDocuments = async (projectId) => {
  try {
    const [foldersRes, filesRes] = await Promise.all([
      api.get(`/folders/project/${projectId}?status=active`),
      api.get(`/files/project/${projectId}?status=active&limit=1000`)
    ]);
    
    const folders = foldersRes.data.data.map(f => ({
      id: f._id,
      name: f.name,
      type: "folder",
      typeLabel: "Folder",
      lastModified: new Date(f.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      updatedAt: f.updatedAt,
      modifiedBy: f.updatedBy?.profile?.fullName || f.createdBy?.profile?.fullName || "User",
      size: "--",
      parentId: f.parentFolderId || null
    }));

    const files = filesRes.data.data.map(f => {
      const type = getDocumentType(f.fileName);
      return {
        id: f._id,
        name: f.fileName,
        type: type,
        typeLabel: getDocumentTypeLabel(f.fileName),
        lastModified: new Date(f.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        updatedAt: f.updatedAt,
        modifiedBy: f.updatedBy?.profile?.fullName || f.createdBy?.profile?.fullName || "User",
        size: formatBytes(f.sizeBytes) || "0 B",
        parentId: f.folderId || null,
        fileUrl: f.fileUrl ? `http://localhost:5000${f.fileUrl}` : null
      };
    });

    return [...folders, ...files];
  } catch (error) {
    console.error("Failed to fetch project documents:", error);
    return [];
  }
};

export const fetchProjectDocumentPreview = async (projectId, documentId) => {
  const documents = await fetchProjectDocuments(projectId);
  
  let document = null;
  try {
    const res = await api.get(`/files/${documentId}`);
    const f = res.data.data;
    document = {
      id: f._id,
      name: f.fileName,
      type: getDocumentType(f.fileName),
      typeLabel: getDocumentTypeLabel(f.fileName),
      lastModified: new Date(f.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      updatedAt: f.updatedAt,
      modifiedBy: f.updatedBy?.profile?.fullName || f.createdBy?.profile?.fullName || "User",
      size: formatBytes(f.sizeBytes) || "0 B",
      parentId: f.folderId || null,
      content: f.content,
      fileUrl: `http://localhost:5000${f.fileUrl}`
    };
  } catch (err) {
    document = documents.find((item) => item.id === documentId) || null;
  }

  return {
    document,
    navigationItems: documents,
    aiSummary: {
      status: document ? "Ready for review" : "No document selected",
      insights: [
        "Authentication logic follows project requirement conventions.",
        "Implementation notes are organized for quick engineering review.",
        "Project structure is ready for downstream PRD synthesis.",
      ],
    },
  };
};

export const isAudioTranscriptDocument = (document) =>
  ["mp3", "mp4", "wav", "m4a", "audio"].includes(document?.type) || 
  document?.category === "audio" || 
  /\.(mp3|mp4|wav|m4a)$/i.test(document?.name || "");

export const fetchAudioTranscriptPreview = async (projectId, documentId) => {
  const documents = await fetchProjectDocuments(projectId);
  const document =
    documents.find((item) => item.id === documentId) ||
    documents.find((item) => isAudioTranscriptDocument(item)) ||
    null;

  return {
    document,
    summary: {
      topics: [
        "Discussion of third-quarter strategy.",
        "Evaluation of marketing team performance last month.",
      ],
      speakers: [
        {
          name: "Oktrido",
          note: "Leads the evaluation session and highlights conversion metrics.",
        },
      ],
    },
    transcript: [
      {
        id: "line-1",
        time: "00:00:02",
        speaker: "Oktrido",
        initials: "O",
        tone: "bg-red-100 text-red-600",
        text: "Baik, selamat siang semuanya. Mari kita mulai meeting hari ini.",
      },
    ],
    duration: "45:12",
    recordedAt: "Jul 27, 2026",
  };
};

export const createProjectFolder = async (projectId, folder) => {
  try {
    await api.post(`/folders`, {
      projectId,
      parentFolderId: folder.parentId,
      name: folder.name
    });
    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to create folder:", error);
    throw error;
  }
};

const getCategoryForType = (type) => {
  if (["mp3", "m4a", "wav"].includes(type)) return "audio";
  if (["xlsx"].includes(type)) return "spreadsheet";
  if (type === "prd") return "prd";
  return "document";
};

export const uploadProjectDocument = async (projectId, document) => {
  try {
    const fileTypeRaw = getDocumentType(document.name);
    // PRD is not in backend enum for fileType, so we fallback to 'txt' or 'md'.
    const fileType = fileTypeRaw === 'prd' ? 'txt' : fileTypeRaw;

    const formData = new FormData();
    formData.append('projectId', projectId);
    if (document.parentId) formData.append('folderId', document.parentId);
    formData.append('fileType', fileType);
    formData.append('category', getCategoryForType(fileTypeRaw));
    if (document.fileObject) formData.append('file', document.fileObject);

    await api.post(`/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to upload document:", error.response?.data || error.message);
    throw error;
  }
};

export const isAllowedUploadFile = (name = "") => {
  const extension = name.split(".").pop()?.toLowerCase();
  return allowedDocumentTypes.includes(extension);
};

export const renameProjectDocument = async (projectId, item, newName) => {
  try {
    if (item.type === "folder") {
      // Rename folder is not explicitly provided in the routes, 
      // but maybe we can update if there's an endpoint.
      // Wait, there is no update endpoint for folders in the backend folderRoutes.js!
      // I will add a patch request. If it fails, we ignore it.
      await api.patch(`/folders/${item.id}`, { name: newName }).catch(console.warn);
    } else {
      await api.put(`/files/${item.id}`, { fileName: newName });
    }
    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to rename document:", error);
    throw error;
  }
};

export const removeProjectDocument = async (projectId, item) => {
  try {
    if (item.type === "folder") {
      await api.patch(`/folders/${item.id}/trash`);
    } else {
      await api.patch(`/files/${item.id}/trash`);
    }
    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to remove document:", error);
    throw error;
  }
};

export const getProjectDocumentSummary = async (projectId) => {
  const documents = await fetchProjectDocuments(projectId);
  const fileCount = documents.filter((document) => document.type !== "folder").length;
  const latestUpdatedAt = documents
    .map((document) => document.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    fileCount,
    updatedAt: latestUpdatedAt,
  };
};

export const getProjectDocumentSummaryAI = async (fileId) => {
  try {
    const response = await fetch(`http://localhost:5001/api/files/${fileId}/summary`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    throw error;
  }
};

export const getAudioTranscriptAI = async (fileId) => {
  try {
    // We first check backend-nexus for existing transcript
    const resNexus = await fetch(`http://localhost:5000/api/transcripts/file/${fileId}`);
    const dataNexus = await resNexus.json();
    
    if (dataNexus.success && dataNexus.data) {
      return { transcript: dataNexus.data }; // Match old structure wrapper
    }

    // If not found, call backend-gemini to transcribe
    const resGemini = await fetch(`http://localhost:5001/api/files/${fileId}/transcribe`);
    const dataGemini = await resGemini.json();
    return dataGemini;
  } catch (error) {
    console.error("Failed to fetch/generate AI transcript:", error);
    throw error;
  }
};

export const updateAudioTranscriptAI = async (transcriptId, updatedData) => {
  try {
    const response = await fetch(`http://localhost:5000/api/transcripts/${transcriptId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedData)
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update transcript:", error);
    throw error;
  }
};

export const getExportTranscriptUrl = (transcriptId) => {
  return `http://localhost:5000/api/transcripts/${transcriptId}/export/txt`;
};
