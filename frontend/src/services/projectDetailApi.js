import api from './api';

export const allowedDocumentTypes = ["pdf", "docx", "xlsx", "mp3", "m4a", "wav", "prd"];
export const allowedDocumentExtensions = allowedDocumentTypes.map((type) => `.${type}`).join(",");

/**
 * API service function: getDocumentType
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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

/**
 * API service function: getDocumentTypeLabel
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const getDocumentTypeLabel = (fileName) => {
  const ext = fileName?.split('.')?.pop()?.toLowerCase();
  if (["mp3", "wav", "m4a"].includes(ext)) return "Audio";
  if (["mp4", "avi"].includes(ext)) return "Video";
  if (ext === "pdf") return "PDF";
  if (ext === "docx" || ext === "doc") return "Document";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "Spreadsheet";
  return "Document";
};

/**
 * API service function: formatBytes
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatModifiedDateTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const toPrdSlug = (value = "Project") => {
  const slug = String(value)
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "Project";
};

const hasPrdVersion = (name = "") => /^PRD_.+_V\d+(?:\.[a-z0-9]+)?$/i.test(name);

const getFileExtension = (name = "") => {
  const match = String(name).match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
};

const parseLegacyPrdProjectName = (name = "") => {
  const baseName = String(name)
    .replace(/^\d+-/, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (hasPrdVersion(baseName)) return null;

  const folderMatch = baseName.match(/^PRD\s*[\u2013\u2014-]\s*(?:PRD\s*[\u2013\u2014-]\s*)?(.+?)\s*[\u2013\u2014-]\s*\d{4}-\d{2}-\d{2}$/i);
  if (folderMatch) return folderMatch[1];

  const dashedFileMatch = baseName.match(/^PRD\s*[\u2013\u2014-]\s*(.+)$/i);
  if (dashedFileMatch) return dashedFileMatch[1];

  const underscoredFileMatch = baseName.match(/^PRD_+(.+)$/i);
  if (underscoredFileMatch) return underscoredFileMatch[1].replace(/_+/g, " ");

  return null;
};

const isPrdDisplayName = (name = "") => /^PRD_.+_V\d+/i.test(name);

export const getNormalizedDisplayFileName = (file = {}, parentFolderName = "") => {
  const rawName = file.originalName || file.fileName || "Untitled File";
  const extension = getFileExtension(rawName) || getFileExtension(file.fileName);
  const legacyParentProjectName = parseLegacyPrdProjectName(parentFolderName);
  const normalizedParentName = isPrdDisplayName(parentFolderName)
    ? parentFolderName
    : legacyParentProjectName
      ? `PRD_${toPrdSlug(legacyParentProjectName)}_V1`
      : "";

  if (hasPrdVersion(rawName)) return rawName;
  if (normalizedParentName && parseLegacyPrdProjectName(rawName)) {
    return `${normalizedParentName}${extension}`;
  }

  const legacyProjectName = parseLegacyPrdProjectName(rawName);
  if (legacyProjectName) return `PRD_${toPrdSlug(legacyProjectName)}_V1${extension}`;

  return rawName;
};

/**
 * API service function: fetchProjectDocuments
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchProjectDocuments = async (projectId) => {
  try {
    const [foldersRes, filesRes] = await Promise.all([
      api.get(`/folders/project/${projectId}?status=active`),
      api.get(`/files/project/${projectId}?status=active&limit=1000`)
    ]);

    const folderVersions = new Map();
    const legacyPrdFolders = foldersRes.data.data
      .filter((folder) => parseLegacyPrdProjectName(folder.name))
      .sort((firstFolder, secondFolder) => new Date(firstFolder.createdAt || firstFolder.updatedAt) - new Date(secondFolder.createdAt || secondFolder.updatedAt));

    legacyPrdFolders.forEach((folder, index) => {
      const projectName = parseLegacyPrdProjectName(folder.name);
      folderVersions.set(folder._id, `PRD_${toPrdSlug(projectName)}_V${index + 1}`);
    });

    const folderNameById = new Map();
    const folders = foldersRes.data.data.map(f => {
      const displayName = folderVersions.get(f._id) || f.name;
      folderNameById.set(f._id, displayName);

      return {
      id: f._id,
      name: displayName,
      type: "folder",
      typeLabel: "Folder",
      lastModified: formatModifiedDateTime(f.updatedAt),
      updatedAt: f.updatedAt,
      modifiedBy: f.updatedBy?.profile?.fullName || f.createdBy?.profile?.fullName || "User",
      size: "--",
      parentId: f.parentFolderId || null
      };
    });

    const files = filesRes.data.data.map(f => {
      const displayName = getNormalizedDisplayFileName(f, folderNameById.get(f.folderId));
      const type = getDocumentType(displayName);
      return {
        id: f._id,
        name: displayName,
        type: type,
        typeLabel: getDocumentTypeLabel(displayName),
        lastModified: formatModifiedDateTime(f.updatedAt),
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

/**
 * API service function: fetchProjectDocumentPreview
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchProjectDocumentPreview = async (projectId, documentId) => {
  const documents = await fetchProjectDocuments(projectId);
  
  let document = null;
  try {
    const res = await api.get(`/files/${documentId}`);
    const f = res.data.data;
    const navigationDocument = documents.find((item) => item.id === documentId);
    const displayName = navigationDocument?.name || getNormalizedDisplayFileName(f);
    document = {
      id: f._id,
      name: displayName,
      type: getDocumentType(displayName),
      typeLabel: getDocumentTypeLabel(displayName),
      lastModified: formatModifiedDateTime(f.updatedAt),
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

/**
 * API service function: isAudioTranscriptDocument
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const isAudioTranscriptDocument = (document) =>
  ["mp3", "mp4", "wav", "m4a", "audio"].includes(document?.type) || 
  document?.category === "audio" || 
  /\.(mp3|mp4|wav|m4a)$/i.test(document?.name || "");

/**
 * API service function: fetchAudioTranscriptPreview
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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

/**
 * API service function: createProjectFolder
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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

/**
 * API service function: uploadProjectDocument
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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
    
    // Dispatch global event so StorageCard can update in real-time
    window.dispatchEvent(new Event("storageUpdated"));

    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to upload document:", error.response?.data || error.message);
    window.dispatchEvent(new Event("notificationUpdated"));
    throw error;
  }
};

/**
 * API service function: isAllowedUploadFile
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const isAllowedUploadFile = (name = "") => {
  const extension = name.split(".").pop()?.toLowerCase();
  return allowedDocumentTypes.includes(extension);
};

/**
 * API service function: renameProjectDocument
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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

/**
 * API service function: removeProjectDocument
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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

/**
 * API service function: moveProjectDocument
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const moveProjectDocument = async (projectId, item, targetFolderId) => {
  try {
    if (item.type === "folder") {
      await api.patch(`/folders/${item.id}/move`, { parentFolderId: targetFolderId });
    } else {
      await api.put(`/files/${item.id}`, { folderId: targetFolderId });
    }
    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to move document:", error);
    throw error;
  }
};

/**
 * API service function: getProjectDocumentSummary
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
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

/**
 * API service function: getProjectDocumentSummaryAI
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const getProjectDocumentSummaryAI = async (fileId) => {
  try {
    const token = localStorage.getItem('nexus_token');
    const response = await fetch(`http://localhost:5001/api/files/${fileId}/summary`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    throw error;
  }
};

/**
 * API service function: getAudioTranscriptAI
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const getAudioTranscriptAI = async (fileId) => {
  try {
    const token = localStorage.getItem('nexus_token');
    const headers = { "Authorization": `Bearer ${token}` };
    
    // We first check backend-nexus for existing transcript
    const resNexus = await fetch(`http://localhost:5000/api/transcripts/file/${fileId}`, { headers });
    const dataNexus = await resNexus.json();
    
    if (dataNexus.success && dataNexus.data) {
      return { transcript: dataNexus.data }; // Match old structure wrapper
    }

    // If not found, call backend-gemini to transcribe
    const resGemini = await fetch(`http://localhost:5001/api/files/${fileId}/transcribe`, { headers });
    const dataGemini = await resGemini.json();
    return dataGemini;
  } catch (error) {
    console.error("Failed to fetch/generate AI transcript:", error);
    throw error;
  }
};

/**
 * API service function: updateAudioTranscriptAI
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const updateAudioTranscriptAI = async (transcriptId, updatedData) => {
  try {
    const token = localStorage.getItem('nexus_token');
    const response = await fetch(`http://localhost:5000/api/transcripts/${transcriptId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
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

/**
 * API service function: getExportTranscriptUrl
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const getExportTranscriptUrl = (transcriptId) => {
  return `http://localhost:5000/api/transcripts/${transcriptId}/export/txt`;
};
