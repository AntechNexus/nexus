import api from "./api";
import {
  fetchProjectDocuments,
  formatBytes,
  getDocumentType,
  getDocumentTypeLabel,
  getNormalizedDisplayFileName,
} from "./projectDetailApi";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NU";

/**
 * API service function: fetchRecentFiles
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
