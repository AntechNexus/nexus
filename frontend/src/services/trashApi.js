import api from "./api";
import { getDocumentType, getDocumentTypeLabel, formatBytes } from "./projectDetailApi";

export const getTrashItems = async () => {
  try {
    const [foldersRes, filesRes] = await Promise.all([
      api.get("/folders/trash/all"),
      api.get("/files/trash/all")
    ]);
    
    const folders = (foldersRes.data?.data || []).map(f => ({
      trashId: `folder-${f._id}`,
      id: f._id,
      parentId: f.parentFolderId || null,
      name: f.name,
      type: "folder",
      typeLabel: "Folder",
      lastModified: new Date(f.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      deletedAt: f.deletedAt || f.updatedAt,
      modifiedBy: f.updatedBy?.profile?.fullName || f.createdBy?.profile?.fullName || "User",
      size: "--",
      projectId: f.projectId,
      projectName: f.projectName
    }));

    const files = (filesRes.data?.data || []).map(f => {
      const type = getDocumentType(f.fileName);
      return {
        trashId: `file-${f._id}`,
        id: f._id,
        parentId: f.folderId || null,
        name: f.fileName,
        type: type,
        typeLabel: getDocumentTypeLabel(f.fileName),
        lastModified: new Date(f.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        deletedAt: f.deletedAt || f.updatedAt,
        modifiedBy: f.updatedBy?.profile?.fullName || f.createdBy?.profile?.fullName || "User",
        size: formatBytes(f.sizeBytes) || "0 B",
        projectId: f.projectId,
        projectName: f.projectName
      };
    });

    return [...folders, ...files].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  } catch (error) {
    console.error("Failed to fetch trash items:", error);
    return [];
  }
};

export const restoreItemFromTrash = async (item) => {
  try {
    if (item.type === "folder") {
      await api.patch(`/folders/${item.id}/restore`);
    } else {
      await api.patch(`/files/${item.id}/restore`);
    }
    return true;
  } catch (error) {
    console.error("Failed to restore item:", error);
    return false;
  }
};

export const removeTrashItem = async (item) => {
  try {
    if (item.type === "folder") {
      await api.delete(`/folders/${item.id}`);
    } else {
      await api.delete(`/files/${item.id}`);
    }
    window.dispatchEvent(new Event("storageUpdated"));
    return true;
  } catch (error) {
    console.error("Failed to permanently delete item:", error);
    return false;
  }
};

export const emptyTrash = async () => {
  try {
    await Promise.all([
      api.delete("/folders/trash/empty"),
      api.delete("/files/trash/empty")
    ]);
    window.dispatchEvent(new Event("storageUpdated"));
    return true;
  } catch (error) {
    console.error("Failed to empty trash:", error);
    return false;
  }
};

export const formatDeletedAt = (dateValue) => {
  if (!dateValue) return "Just now";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

