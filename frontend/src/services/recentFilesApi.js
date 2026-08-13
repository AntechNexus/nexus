import api from "./api";
import {
  fetchProjectDocuments,
  formatBytes,
  getDocumentType,
  getDocumentTypeLabel,
  getNormalizedDisplayFileName,
} from "./projectDetailApi";

/**
 * Extracts and formats the initials from a given full name string.
 *
 * This utility function takes a string representing a person's name, splits it by spaces,
 * and extracts the first letter of up to the first two parts of the name. It filters out
 * any empty strings that might result from multiple spaces. The extracted letters are then
 * combined, converted to uppercase, and returned. If the resulting string is empty (e.g.,
 * if no valid name was provided), it falls back to a default value of "NU" (New User).
 *
 * @param {string} [name=""] - The full name string from which to extract initials. Defaults to an empty string.
 * @returns {string} The uppercase initials extracted from the name, or "NU" if none could be derived.
 */
const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NU";

let recentFilesCache = null;
let recentFilesCacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

/**
 * Retrieves a list of the user's most recently accessed or modified files across all projects.
 *
 * @param {number} [limit=10] - The maximum number of recent file entries to fetch from the server.
 * @param {boolean} [forceRefresh=false] - If true, bypasses the cache and forces a fresh fetch from the backend.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of enriched file objects. 
 */
export const fetchRecentFiles = async (limit = 10, forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && recentFilesCache && (now - recentFilesCacheTimestamp < CACHE_DURATION)) {
    return recentFilesCache;
  }

  try {
    const res = await api.get(`/files/recent?limit=${limit}`);
    const entries = res.data?.data || [];
    const projectIds = Array.from(new Set(entries.map((entry) => entry.projectId?._id || entry.projectId).filter(Boolean)));
    const documentsByProject = await Promise.all(
      projectIds.map(async (projectId) => [projectId, await fetchProjectDocuments(projectId).catch(() => [])]),
    );
    const documentById = new Map(
      documentsByProject.flatMap(([, documents]) => documents.map((document) => [document.id, document])),
    );

    const result = entries.map((entry) => {
      const file = entry.fileId || {};
      const normalizedDocument = documentById.get(file._id);
      const displayName = normalizedDocument?.name || getNormalizedDisplayFileName(file, file.folderId?.name);
      const modifiedBy = file.updatedBy?.profile?.fullName || file.createdBy?.profile?.fullName || "New User";
      return {
        id: file._id || entry._id,
        name: displayName,
        project: entry.projectId?.name || "Unknown Project",
        projectId: entry.projectId?._id || entry.projectId,
        type: getDocumentType(displayName),
        typeLabel: getDocumentTypeLabel(displayName),
        lastModified: new Date(entry.accessedAt || entry.updatedAt || file.updatedAt || new Date()).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        modifiedBy,
        modifiedByInitials: getInitials(modifiedBy),
        size: formatBytes(file.sizeBytes) || "0 B",
      };
    });

    recentFilesCache = result;
    recentFilesCacheTimestamp = now;
    return result;
  } catch (error) {
    console.error("Failed to fetch recent files:", error);
    return [];
  }
};

/**
 * Explicitly clears the recent files cache.
 */
export const clearRecentFilesCache = () => {
  recentFilesCache = null;
  recentFilesCacheTimestamp = 0;
};
