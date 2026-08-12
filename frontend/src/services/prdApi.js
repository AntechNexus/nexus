import tokenService from "./token.service";

const NEXUS_API = import.meta.env.VITE_NEXUS_API_URL || "http://localhost:5000/api";
const GEMINI_API = import.meta.env.VITE_GEMINI_API_URL || "http://localhost:5001/api";

const getAuthHeaders = () => {
  const token = tokenService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Nexus API calls ────────────────────────────────────────────────────────

/**
 * Retrieves a list of all projects associated with the currently authenticated user.
 * 
 * This function performs an HTTP GET request to the core Nexus API to fetch projects
 * where the current user is either the owner or an accepted member. It securely attaches
 * the user's authorization token to the request headers. The backend is responsible for
 * filtering the projects based on the user's role and permissions, ensuring no unauthorized
 * projects are leaked.
 * 
 * Upon receiving a successful response, the function transforms the raw project data into a
 * structured array of objects tailored for frontend consumption. It calculates a human-readable
 * `updatedLabel` and sets default values for missing properties like `fileCount`. If the network
 * request fails or returns a non-200 status, it throws an error to be handled by the UI.
 * 
 * @returns {Promise<Array<Object>>} A promise resolving to an array of formatted project objects, each containing an ID, title, description, file count, and an updated timestamp label.
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

/**
 * Fetches the metadata of all active files associated with a specific project.
 * 
 * This function makes an HTTP GET request to the Nexus backend file management endpoint,
 * appending the target `projectId` to the URL. It is typically used to populate the file
 * explorer or attachments view within a project dashboard. The request includes the standard
 * authorization token to verify the user has access to this project's contents.
 * 
 * Once the JSON payload is successfully retrieved, it maps the raw file documents to a
 * standardized UI format. This mapping process includes converting raw byte sizes into
 * readable strings (e.g., "KB", "MB") using the internal `formatBytes` utility. Any server
 * errors or network failures result in a rejected promise with a descriptive error message.
 * 
 * @param {string} projectId - The unique identifier of the project whose files are being requested.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of file objects, containing parsed names, human-readable sizes, types, and categories.
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
 * Uploads local files to a specific project and associates existing remote files.
 * 
 * This highly crucial function constructs a multipart `FormData` payload to facilitate
 * the upload of actual binary files from the user's browser to the backend server. It appends
 * the target `projectId`, any already uploaded file IDs (`nexusFileIds`), and iterates over
 * the `localFiles` array to append each raw File object to the payload.
 * 
 * The function targets the PRD generation service's file saving endpoint via an HTTP POST request.
 * Because it uses `FormData`, the browser automatically sets the correct `Content-Type` boundary,
 * so the authorization headers are applied manually. If the upload process is successful, the server
 * saves the files and optionally triggers background tasks like audio transcription. Failures during
 * this complex multi-part upload are caught and transformed into standard JavaScript errors.
 * 
 * @param {string} projectId - The ID of the destination project for the uploaded files.
 * @param {Array<File>} localFiles - An array of native browser File objects selected by the user for upload.
 * @param {Array<string>} [nexusFileIds=[]] - An array of string identifiers representing files already stored in Nexus to be linked.
 * @returns {Promise<Object>} A promise resolving to an object containing the array of newly `savedFileIds`.
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
 * Persists a generated Product Requirements Document (PRD) to the backend storage.
 * 
 * This function orchestrates an HTTP POST request to the PRD generation service. Its primary
 * role is to take the final raw Markdown string generated by the AI, along with associated
 * metadata (like the project ID and a chosen name), and send it to the server. The server
 * is then responsible for compiling this Markdown into structured formats (like DOCX and PDF)
 * and filing them appropriately within the project's folder structure.
 * 
 * The payload is strictly serialized to JSON and sent with the requisite `Content-Type` and
 * authorization headers. Should the server fail to process the Markdown or encounter a filesystem
 * error while saving the documents, this function intercepts the non-200 response, extracts
 * the error details, and bubbles up a clear exception for the frontend to notify the user.
 * 
 * @param {Object} payload - The complete data package required to save the PRD.
 * @param {string} payload.rawMarkdown - The raw markdown text content of the generated PRD.
 * @param {string} payload.projectId - The ID of the project where the PRD should be stored.
 * @param {string} payload.prdName - The designated filename or title for the saved PRD.
 * @param {Array<string>} payload.sourceFileIds - Identifiers of files used as context to generate this PRD.
 * @returns {Promise<Object>} A promise resolving to a confirmation object from the server detailing the saved file metadata.
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
 * Uploads context files directly to the Gemini AI microservice for initial analysis and clarification.
 * 
 * This function acts as the first phase in the multi-step PRD generation process. It constructs
 * a `FormData` object containing the user's selected raw File objects and transmits them via
 * an HTTP POST request to the Gemini API layer. The microservice processes these files in memory,
 * caching their contents and utilizing the AI to generate a set of "clarifying questions" based
 * on any ambiguities found within the uploaded materials.
 * 
 * Unlike standard endpoints, this does not require explicit authentication headers as the upload
 * boundary handles its own structural requirements. The response is highly critical: it returns
 * a unique `cacheId` referencing the temporarily stored files on the server, alongside an array
 * of dynamically generated questions that the user must answer before a full PRD can be drafted.
 * 
 * @param {Array<File>} files - An array of native browser File objects serving as the source material for the AI.
 * @returns {Promise<Object>} A promise resolving to an object containing a `cacheId` string and an array of `questions` objects.
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
 * Commands the Gemini AI microservice to draft a full Product Requirements Document.
 * 
 * This is the capstone function of the generation workflow. It executes an HTTP POST request
 * sending a carefully constructed JSON payload to the Gemini API. The payload combines the
 * `cacheId` (representing the previously uploaded source files), the original AI-generated
 * `questions`, the user's specific text `answers`, and an optional `versionName`.
 * 
 * The microservice uses this complete context to instruct the language model to synthesize
 * a comprehensive PRD in Markdown format. Because this process can be computationally intensive,
 * the request may take longer than standard API calls. Upon success, it parses the JSON response
 * which contains the finalized `prd` string (raw markdown). Errors from the AI generation
 * engine are caught and thrown as actionable exceptions.
 * 
 * @param {string} cacheId - The unique session identifier mapping to the uploaded source files on the server.
 * @param {Object} answers - A dictionary/map correlating question IDs to the user's text answers.
 * @param {Array<Object>} questions - The original array of question objects posed by the AI during the clarification step.
 * @param {string} [versionName] - An optional string identifying the version or iteration of the generated PRD.
 * @returns {Promise<Object>} A promise resolving to an object containing the fully drafted `prd` as a raw Markdown string.
 */
export const generatePrd = async (cacheId, answers, questions, versionName) => {
  const res = await fetch(`${GEMINI_API}/generate-prd`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cacheId, answers, questions, versionName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate PRD");
  }
  return res.json();
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * A utility function to format raw byte counts into human-readable storage units.
 * 
 * This internal helper is used across the service to convert numeric byte values
 * received from the backend (e.g., file sizes) into standard strings formatted with
 * appropriate unit suffixes like B, KB, MB, or GB. It uses a base-1024 conversion
 * logic to accurately reflect binary data sizes.
 * 
 * The output is constrained to a maximum of two decimal places for gigabytes, and
 * one decimal place for megabytes and kilobytes, ensuring a clean and consistent
 * presentation in the user interface.
 * 
 * @param {number} [bytes=0] - The raw numerical size of a file in bytes.
 * @returns {string} The formatted string representing the size with its corresponding unit (e.g., "1.5 MB").
 */
const formatBytes = (bytes = 0) => {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
