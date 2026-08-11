const NEXUS_API = import.meta.env.VITE_NEXUS_API_URL || "http://localhost:5000/api";
const GEMINI_API = import.meta.env.VITE_GEMINI_API_URL || "http://localhost:5001/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("nexus_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Nexus API calls ────────────────────────────────────────────────────────

/** Fetch all projects where current user is owner or accepted member */
/**
 * API service function: fetchMyProjects
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchMyProjects = async () => {
  const res = await fetch(`${NEXUS_API}/projects`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  const data = await res.json();
  // data is an array of projects – filter for owner/accepted member on the backend already
  return (data.data || data || []).map((p) => ({
    id: p._id,
    title: p.name,
    description: p.description,
    fileCount: p.fileCount ?? 0,
    updatedLabel: p.updatedAt
      ? `Updated ${new Date(p.updatedAt).toLocaleDateString()}`
      : "Updated recently",
  }));
};

/** Fetch all active files in a project */
/**
 * API service function: fetchProjectFiles
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchProjectFiles = async (projectId) => {
  const res = await fetch(`${NEXUS_API}/files/project/${projectId}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch project files");
  const data = await res.json();
  return (data.data || data || []).map((f) => ({
    id: f._id,
    name: f.originalName || f.fileName,
    size: formatBytes(f.sizeBytes),
    type: f.fileType,
    category: f.category,
  }));
};

/**
 * Save locally-uploaded files into the nexus project
 * and trigger auto-transcription for audio files.
 * @param {string} projectId
 * @param {File[]} localFiles - browser File objects
 * @param {string[]} nexusFileIds - array of existing nexus file _id strings
 * @returns {{ savedFileIds: string[] }}
 */
/**
 * API service function: saveFilesToProject
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const saveFilesToProject = async (projectId, localFiles, nexusFileIds = []) => {
  const formData = new FormData();
  formData.append("projectId", projectId);
  formData.append("nexusFileIds", JSON.stringify(nexusFileIds));
  for (const file of localFiles) {
    formData.append("files", file);
  }
  const res = await fetch(`${NEXUS_API}/prd/generate/save-files`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to save files to project");
  }
  return res.json();
};

/**
 * Save the generated PRD to the project as DOCX + PDF in a new folder.
 * @param {{ rawMarkdown, projectId, prdName, sourceFileIds }} payload
 */
/**
 * API service function: savePrd
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const savePrd = async (payload) => {
  const res = await fetch(`${NEXUS_API}/prd/generate/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to save PRD");
  }
  return res.json();
};

// ─── Gemini AI calls ────────────────────────────────────────────────────────

/**
 * Upload files to Gemini microservice. Returns cacheId and clarifying questions.
 * Files must be browser File objects.
 * @param {File[]} files
 * @returns {{ cacheId: string, questions: object[] }}
 */
/**
 * API service function: uploadAndClarify
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const uploadAndClarify = async (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch(`${GEMINI_API}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upload files to AI");
  }
  return res.json();
};

/**
 * Generate PRD from a cacheId + clarification answers.
 * @param {string} cacheId
 * @param {object} answers - map of question id → answer
 * @param {object[]} questions - array of question objects
 * @returns {{ prd: string }} rawMarkdown
 */
/**
 * API service function: generatePrd
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const generatePrd = async (cacheId, answers, questions) => {
  const res = await fetch(`${GEMINI_API}/generate-prd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cacheId, answers, questions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate PRD");
  }
  return res.json();
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatBytes = (bytes = 0) => {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
