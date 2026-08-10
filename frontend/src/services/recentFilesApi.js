import api from "./api";
import { getDocumentType, getDocumentTypeLabel, formatBytes } from "./projectDetailApi";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NU";

export const fetchRecentFiles = async (limit = 10) => {
  try {
    const res = await api.get(`/files/recent?limit=${limit}`);
    const entries = res.data?.data || [];
    return entries.map((entry) => {
      const file = entry.fileId || {};
      const modifiedBy = file.updatedBy?.profile?.fullName || file.createdBy?.profile?.fullName || "New User";
      return {
        id: file._id || entry._id,
        name: file.fileName || "Unnamed File",
        project: entry.projectId?.name || "Unknown Project",
        projectId: entry.projectId?._id || entry.projectId,
        type: getDocumentType(file.fileName),
        typeLabel: getDocumentTypeLabel(file.fileName),
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
