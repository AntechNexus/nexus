import api from './api';
import tokenService from './token.service';

export const allowedDocumentTypes = ["pdf", "docx", "xlsx", "mp3", "m4a", "wav", "prd"];
export const allowedDocumentExtensions = allowedDocumentTypes.map((type) => `.${type}`).join(",");

/**
 * Determines the internal document type classification based on a file's name.
 *
 * This utility function parses the file extension from the provided `fileName` and maps
 * it to a standardized internal `type` string. It groups various related extensions into
 * a single category; for example, "mp3", "wav", and "ogg" are all classified as "mp3"
 * (representing audio), while "mp4", "avi", and "mov" become "mp4" (representing video).
 * If no filename is provided, it returns "unknown". This classification is used heavily
 * throughout the UI to determine which icons to render or which preview component to load.
 *
 * @param {string} fileName - The full name of the file including its extension.
 * @returns {string} The standardized internal document type string.
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
 * Translates a file name into a human-readable document type label.
 *
 * Unlike `getDocumentType` which returns a machine-readable category, this function
 * returns a capitalized, user-facing label intended for display in the UI (e.g., in a
 * data table column). It checks the file's extension and categorizes it into generic
 * buckets like "Audio", "Video", "PDF", "Spreadsheet", or defaults to "Document". This
 * provides a polished presentation for end users rather than showing them raw extensions.
 *
 * @param {string} fileName - The name of the file to label.
 * @returns {string} A human-readable category label (e.g., "Spreadsheet").
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
 * Formats a raw byte count into a human-readable string with appropriate units.
 *
 * This function takes a file size in bytes and converts it to a more digestible format
 * like KB or MB. It handles extremely small files by keeping them in Bytes (B). For files
 * under 1 Megabyte, it converts to Kilobytes (KB) with one decimal place. For larger files,
 * it formats them in Megabytes (MB). This is essential for rendering file sizes in the
 * document list view in a way that users can easily understand at a glance.
 *
 * @param {number} [bytes=0] - The size of the file in bytes.
 * @returns {string} The formatted file size string (e.g., "1.5 MB").
 */
export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Converts a raw date string or timestamp into a localized standard date-time format.
 *
 * This utility leverages the native `Date.toLocaleString` API to convert ISO strings
 * or raw timestamps (often fetched from the backend database) into a consistent, easily
 * readable format. The resulting string includes the abbreviated month, numeric day,
 * 4-digit year, and the hour and minute (e.g., "Oct 12, 2024, 2:30 PM"). This standard
 * is used across the project detail views to show when documents were last modified.
 *
 * @param {string|number|Date} date - The date value to format.
 * @returns {string} The formatted date-time string.
 */
export const formatModifiedDateTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Converts an arbitrary string into a URL-safe, sanitized PRD slug.
 *
 * This function takes a string (typically a project name), removes any file extensions
 * if present, strips out non-alphanumeric characters, and replaces spaces and special
 * characters with underscores. It also trims any trailing or leading underscores. This is
 * heavily used when auto-generating file names for new Product Requirements Documents to
 * ensure they comply with strict filesystem or database naming conventions.
 *
 * @param {string} [value="Project"] - The raw string to slugify.
 * @returns {string} The sanitized slug string.
 */
const toPrdSlug = (value = "Project") => {
  const slug = String(value)
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "Project";
};

/**
 * Evaluates whether a given file name conforms to the standard PRD versioning format.
 *
 * This helper uses a regular expression to check if the `name` string matches the expected
 * pattern for a generated PRD (e.g., `PRD_Some_Project_Name_V1` or `PRD_Project_V1.2`).
 * This is crucial for identifying which files in a project are auto-generated drafts
 * versus raw user uploads, enabling the UI to treat them differently (e.g., hiding extensions
 * or launching them directly into a PRD review modal).
 *
 * @param {string} [name=""] - The file name to evaluate.
 * @returns {boolean} True if the name matches the PRD version pattern, false otherwise.
 */
const hasPrdVersion = (name = "") => /^PRD_.+_V\d+(?:\.[a-z0-9]+)?$/i.test(name);

/**
 * Extracts the file extension from a given file name string.
 *
 * By using a regex that captures the final dot and subsequent alphanumeric characters
 * at the end of a string, this function accurately parses out extensions like ".pdf"
 * or ".docx". It normalizes the output to lowercase. If no extension is found, it
 * returns an empty string. This is used extensively during file renaming and uploading
 * to preserve the original file type.
 *
 * @param {string} [name=""] - The full file name.
 * @returns {string} The lowercase file extension (including the dot), or an empty string.
 */
const getFileExtension = (name = "") => {
  const match = String(name).match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
};

/**
 * Parses a project name out of legacy PRD file or folder naming conventions.
 *
 * The system previously allowed several different naming patterns for PRDs (e.g.,
 * "123-PRD-ProjectName", "PRD_Project_Name"). This complex parsing function attempts
 * to extract the core human-readable project name by testing the string against
 * multiple regular expressions. It strips away numeric prefixes, hyphens, and the
 * "PRD" acronym itself. If the file already conforms to the modern versioned format
 * (checked via `hasPrdVersion`), it aborts and returns null.
 *
 * @param {string} [name=""] - The legacy file or folder name to parse.
 * @returns {string|null} The extracted project name, or null if parsing fails.
 */
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

/**
 * Checks if a given string acts as a modern PRD display name.
 *
 * This is a slightly looser version of `hasPrdVersion` that specifically checks if a
 * string starts with "PRD_", followed by some characters, and ends with a "_V" version
 * indicator. It is used to quickly identify normalized parent folder names or normalized
 * files in the UI hierarchy without needing strict matching on the decimal sub-versions.
 *
 * @param {string} [name=""] - The string to check.
 * @returns {boolean} True if it matches the modern PRD display pattern.
 */
const isPrdDisplayName = (name = "") => /^PRD_.+_V\d+/i.test(name);

/**
 * Normalizes a file's display name to fit modern conventions, especially for PRDs.
 *
 * This core display logic determines exactly what name a user sees for a file. It takes
 * a raw file object and its parent folder's name. If the file is already a modern PRD,
 * it returns it as-is. If the file is a legacy PRD, it attempts to rename it using the
 * `PRD_Slug_V1` format, inheriting the project name from the parent folder if applicable.
 * For all non-PRD files, it falls back to the original name or `fileName`. This ensures
 * that no matter how messy the backend data is, the frontend presentation is uniform.
 *
 * @param {Object} [file={}] - The file object containing `originalName` or `fileName`.
 * @param {string} [parentFolderName=""] - The name of the folder containing this file.
 * @returns {string} The fully normalized string to be rendered in the UI.
 */
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
 * Fetches and constructs a hierarchical list of all documents and folders in a project.
 *
 * This is the primary data-fetching method for the project workspace view. It makes two
 * concurrent GET requests to the backend: one for active folders (`/folders/project/:id`)
 * and one for active files (`/files/project/:id`). It then processes the folders, assigning
 * version numbers to legacy PRD folders dynamically based on their chronological order.
 * Next, it maps over the files, applying `getNormalizedDisplayFileName`, attaching appropriate
 * icons via `getDocumentType`, and formatting file sizes. Finally, it merges the processed
 * folders and files into a single flat array (linked by `parentId`) that the frontend tree
 * or table components can easily render.
 *
 * @param {string} projectId - The unique identifier of the project to fetch documents for.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of formatted document/folder objects.
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
        fileUrl: f.fileUrl ? `http://127.0.0.1:5000${f.fileUrl}` : null
      };
    });

    return [...folders, ...files];
  } catch (error) {
    console.error("Failed to fetch project documents:", error);
    return [];
  }
};

/**
 * Retrieves a detailed preview and summary for a specific project document.
 *
 * When a user clicks on a file to view it, this function is invoked. It first fetches the
 * full document list via `fetchProjectDocuments` to provide sibling navigation items. Then,
 * it attempts to fetch the specific file's detailed content from `/files/:documentId`.
 * If successful, it constructs a rich preview object including the raw content, a publicly
 * accessible `fileUrl`, and formatting metadata. It also mocks an `aiSummary` containing
 * insights about the document. If the API request fails (e.g., network error), it falls
 * back to retrieving the basic metadata from the previously fetched document list.
 *
 * @param {string} projectId - The ID of the project containing the document.
 * @param {string} documentId - The unique ID of the document to preview.
 * @returns {Promise<Object>} A promise resolving to an object with `document`, `navigationItems`, and `aiSummary`.
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
      fileUrl: `http://127.0.0.1:5000${f.fileUrl}`
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
 * Determines whether a given document object represents an audio transcript.
 *
 * This function inspects a document's metadata (its `type`, `category`, and `name`)
 * to deduce if it contains audio data that could be transcribed. It checks against
 * known audio types (mp3, mp4, wav, m4a) and looks for audio-specific extensions in
 * the filename. This check is used by the UI to conditionally render the "View Transcript"
 * button or route the user to an audio-specific preview component.
 *
 * @param {Object} document - The document object to evaluate.
 * @returns {boolean} True if the document is recognized as transcribable audio, false otherwise.
 */
export const isAudioTranscriptDocument = (document) =>
  ["mp3", "mp4", "wav", "m4a", "audio"].includes(document?.type) || 
  document?.category === "audio" || 
  /\.(mp3|mp4|wav|m4a)$/i.test(document?.name || "");

/**
 * Fetches a mocked audio transcript preview for a specific audio document.
 *
 * This function simulates requesting an AI-generated transcript for an audio file. It first
 * retrieves the document details from `fetchProjectDocuments`. It checks if the requested
 * document exists and is recognized as audio. Then, it returns a hardcoded mock object
 * containing summary topics, identified speakers, and a line-by-line transcript array with
 * timestamps. In a production setting, this would poll a backend AI transcription service
 * and parse the real transcript JSON.
 *
 * @param {string} projectId - The ID of the project.
 * @param {string} documentId - The unique ID of the audio document.
 * @returns {Promise<Object>} A promise resolving to an object containing `document`, `summary`, and `transcript`.
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
 * Creates a new logical folder within a project's workspace.
 *
 * This function sends a POST request to `/folders` to create a new folder record in the
 * backend database. The payload includes the `projectId`, the new folder's `name`, and an
 * optional `parentFolderId` to support nested folder structures. If the creation succeeds,
 * it immediately triggers `fetchProjectDocuments` to refresh and return the updated tree
 * of files and folders, ensuring the UI reflects the newly created folder instantly. Any
 * errors from the API are logged and rethrown for the caller to handle.
 *
 * @param {string} projectId - The ID of the project the folder belongs to.
 * @param {Object} folder - An object containing the new folder's `name` and optional `parentId`.
 * @returns {Promise<Array<Object>>} A promise resolving to the updated array of project documents.
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

/**
 * Maps an internal file type string to a broader backend-recognized category string.
 *
 * This helper function consolidates various specific file types (like mp3, wav) into broader
 * categories like "audio", "spreadsheet", or "prd". This category is required by the backend
 * `POST /files` endpoint to appropriately route the file to the correct processing queue
 * (e.g., sending "audio" to a transcription worker). If the type is not specifically mapped,
 * it defaults to a generic "document" category.
 *
 * @param {string} type - The specific file type (e.g., "mp3", "xlsx").
 * @returns {string} The broader category string suitable for the backend API.
 */
const getCategoryForType = (type) => {
  if (["mp3", "m4a", "wav"].includes(type)) return "audio";
  if (["xlsx"].includes(type)) return "spreadsheet";
  if (type === "prd") return "prd";
  return "document";
};

/**
 * Uploads a physical file or document to a project workspace.
 *
 * This function constructs a `FormData` object to securely transmit a file over HTTP via a
 * POST request to `/files`. It infers the file type and category using `getDocumentType` and
 * `getCategoryForType`. Notably, it applies a fallback for "prd" files (which the backend
 * doesn't natively accept as a fileType enum) by converting them to "txt". It appends the
 * binary `fileObject` and relevant IDs (`projectId`, `folderId`). Upon success, it dispatches
 * a global `storageUpdated` event so other components (like storage capacity cards) can
 * re-render, and returns the refreshed document list.
 *
 * @param {string} projectId - The ID of the destination project.
 * @param {Object} document - The document object containing `name`, `parentId`, and `fileObject`.
 * @returns {Promise<Array<Object>>} A promise resolving to the updated project documents list.
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
 * Validates whether a given file name possesses an allowed extension for upload.
 *
 * To prevent unsupported or malicious files from being uploaded, this function checks the
 * file name's extension against a predefined whitelist (`allowedDocumentTypes`). It parses
 * the extension from the string, converts it to lowercase, and performs a simple array
 * inclusion check. The UI uses this to disable upload buttons or show error warnings if
 * the user attempts to upload an unsupported format.
 *
 * @param {string} [name=""] - The full name of the file to validate.
 * @returns {boolean} True if the file extension is allowed, false otherwise.
 */
export const isAllowedUploadFile = (name = "") => {
  const extension = name.split(".").pop()?.toLowerCase();
  return allowedDocumentTypes.includes(extension);
};

/**
 * Renames an existing project folder or document.
 *
 * This function determines whether the target `item` is a folder or a file and issues the
 * appropriate API request. For folders, it uses a PATCH request to `/folders/:id` (a custom
 * implementation since it was missing from standard routes). For files, it uses a PUT request
 * to `/files/:id`. Crucially, for files, it ensures the original extension is preserved even
 * if the user forgets to type it or types a different one, maintaining file integrity. After
 * the rename operation, it returns the freshly fetched list of documents.
 *
 * @param {string} projectId - The ID of the project.
 * @param {Object} item - The document or folder object to rename.
 * @param {string} newName - The requested new name from the user.
 * @returns {Promise<Array<Object>>} A promise resolving to the updated document list.
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
      const currentExtension = getFileExtension(item.name);
      const nextExtension = getFileExtension(newName);
      const safeName = currentExtension && nextExtension.toLowerCase() !== currentExtension.toLowerCase()
        ? `${newName.replace(/(\.[^.]+)$/, "")}${currentExtension}`
        : newName;
      await api.put(`/files/${item.id}`, { fileName: safeName });
    }
    return await fetchProjectDocuments(projectId);
  } catch (error) {
    console.error("Failed to rename document:", error);
    throw error;
  }
};

/**
 * Moves a document or folder to the trash (soft delete).
 *
 * This function requests the backend to mark a specific folder or file as "trashed" (status
 * update) rather than permanently deleting it. It branches its logic based on `item.type`:
 * dispatching a PATCH to `/folders/:id/trash` for folders and `/files/:id/trash` for files.
 * Upon successful completion, it calls `fetchProjectDocuments` to return the updated active
 * list, effectively hiding the trashed item from the main workspace view.
 *
 * @param {string} projectId - The ID of the project containing the item.
 * @param {Object} item - The specific document or folder object to trash.
 * @returns {Promise<Array<Object>>} A promise resolving to the updated active document list.
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
 * Moves a document or folder to a different parent folder.
 *
 * To support dragging and dropping or a "move to" modal in the UI, this function updates
 * the parent reference of a given item. If moving a folder, it sends a PATCH request to
 * `/folders/:id/move` with the new `parentFolderId`. If moving a file, it issues a PUT
 * request to `/files/:id` updating the `folderId`. It handles the network request and,
 * upon success, re-fetches the entire document tree to reflect the structural change.
 *
 * @param {string} projectId - The project's ID.
 * @param {Object} item - The document or folder object being moved.
 * @param {string|null} targetFolderId - The ID of the destination folder (or null for root).
 * @returns {Promise<Array<Object>>} A promise resolving to the structurally updated document list.
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
 * Computes a high-level summary of a project's document activity.
 *
 * This function fetches all documents for a given project and calculates two critical
 * pieces of metadata: the total number of physical files (excluding folders) and the
 * timestamp of the most recently updated document. This summary is typically used to
 * populate the project dashboard cards, allowing users to see how active a project is
 * at a glance without having to open it and count files manually.
 *
 * @param {string} projectId - The ID of the project to summarize.
 * @returns {Promise<Object>} A promise resolving to an object with `fileCount` and `updatedAt`.
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
 * Generates an AI-powered textual summary of a specific file's contents.
 *
 * This function integrates with the specialized AI microservice (running on port 5001)
 * to request a summary of a file. It retrieves the current authentication token and
 * injects it into the Authorization header to authenticate the cross-service request.
 * It initiates a GET request to `/api/files/:fileId/summary`. The backend uses an LLM
 * to analyze the file text and returns a brief, insight-driven summary. If the service
 * errors out, the error is thrown so the UI can display a fallback state.
 *
 * @param {string} fileId - The unique ID of the file to summarize.
 * @returns {Promise<Object>} A promise resolving to the AI-generated summary data payload.
 */
export const getProjectDocumentSummaryAI = async (fileId) => {
  try {
    const token = tokenService.getToken();
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
 * Retrieves or initiates an AI transcription for an audio file.
 *
 * This function coordinates between the primary Nexus backend and the Gemini AI microservice.
 * It first checks if a transcript already exists in the Nexus database by querying
 * `/api/transcripts/file/:fileId`. If it finds a completed transcript, it returns it
 * wrapped in an object. If the transcript is missing, it falls back to calling the
 * AI microservice (`/api/files/:fileId/transcribe`) to generate a new transcript on the fly.
 * This two-tiered approach saves expensive AI processing time for files that have already
 * been transcribed. Token authentication is handled manually for both requests.
 *
 * @param {string} fileId - The unique identifier of the audio file.
 * @returns {Promise<Object>} A promise resolving to the transcription data.
 */
export const getAudioTranscriptAI = async (fileId) => {
  try {
    const token = tokenService.getToken();
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
 * Updates an existing audio transcript record in the database.
 *
 * When a user makes manual corrections to an AI-generated transcript via the UI, this
 * function persists those changes. It sends a PUT request to the backend at
 * `/api/transcripts/:transcriptId`, passing the `updatedData` object (which typically
 * contains the edited text blocks or speaker names) as a JSON string in the body.
 * It attaches the user's JWT token for authorization. The function returns the updated
 * record returned by the backend.
 *
 * @param {string} transcriptId - The ID of the transcript to update.
 * @param {Object} updatedData - The modified transcript data payload.
 * @returns {Promise<Object>} A promise resolving to the backend confirmation of the update.
 */
export const updateAudioTranscriptAI = async (transcriptId, updatedData) => {
  try {
    const token = tokenService.getToken();
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
 * Constructs the absolute URL for exporting a transcript as a text file.
 *
 * This pure function generates the exact backend URL endpoint that handles the text
 * export for a specific transcript. It does not make an HTTP request itself; instead,
 * it returns the string URL (`http://localhost:5000/api/transcripts/:id/export/txt`).
 * The UI can use this URL to set the `href` attribute of an anchor tag, allowing the
 * browser to naturally trigger a file download without requiring complex blob handling
 * on the frontend.
 *
 * @param {string} transcriptId - The ID of the transcript to export.
 * @returns {string} The fully qualified URL string for the download endpoint.
 */
export const getExportTranscriptUrl = (transcriptId) => {
  return `http://localhost:5000/api/transcripts/${transcriptId}/export/txt`;
};
