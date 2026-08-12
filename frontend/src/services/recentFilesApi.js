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

/**
 * Retrieves a list of the user's most recently accessed or modified files across all projects.
 *
 * This function is a core piece of the recent files feature. It first makes an HTTP GET
 * request to the `/files/recent` backend endpoint, optionally constrained by a limit parameter.
 * It expects a paginated or array-based response from which it extracts the file entries.
 *
 * To provide rich context, the function gathers all unique project IDs associated with these
 * recent files. It then performs parallel asynchronous requests using `fetchProjectDocuments`
 * for each unique project to retrieve comprehensive document metadata. This metadata is
 * aggregated into a Map for fast lookups.
 *
 * Finally, the function maps over the original recent file entries, matching them against
 * the enriched document data. It constructs and returns an array of standardized objects
 * containing formatted file sizes, resolved document types, human-readable modification
 * dates, and author information, ensuring a consistent structure for the UI components to consume.
 *
 * @param {number} [limit=10] - The maximum number of recent file entries to fetch from the server.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of enriched file objects. 
 * Each object contains details such as id, name, project, type, lastModified, modifiedBy, and size.
 * In case of a network error or processing failure, it catches the exception, logs it, and returns an empty array.
 */
export const fetchRecentFiles = async (limit = 10) => {
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

    return entries.map((entry) => {
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
  } catch (error) {
    console.error("Failed to fetch recent files:", error);
    return [];
  }
};
