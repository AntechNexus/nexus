import api from "./api";
import { getDocumentType, getDocumentTypeLabel, formatBytes } from "./projectDetailApi";

/**
 * Retrieves a consolidated list of all items (both files and folders) currently residing in the trash.
 *
 * This function serves as the primary data fetcher for the Trash view. It initiates two concurrent
 * HTTP GET requests using `Promise.all`: one to fetch deleted folders (`/folders/trash/all`) and 
 * another to fetch deleted files (`/files/trash/all`). 
 *
 * Upon successfully receiving both responses, it processes and normalizes the data. It maps over
 * the raw folder and file objects, mapping their properties to a unified structure suitable for
 * a single list view. This includes generating unique `trashId`s, determining document types, 
 * formatting file sizes, and calculating human-readable deletion dates.
 *
 * Finally, the function combines both arrays and sorts the unified list in descending order 
 * based on the `deletedAt` timestamp, ensuring the most recently deleted items appear first.
 * If either request fails, it catches the error and returns an empty array to prevent UI crashes.
 *
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of normalized trash item objects, 
 * sorted by deletion date.
 */
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

/**
 * Restores a previously deleted file or folder from the trash back to its original location.
 *
 * This function interprets the type of the provided `item` object to determine the correct
 * backend endpoint to call. If the item is a folder, it sends an HTTP PATCH request to 
 * `/folders/${item.id}/restore`. If the item is a file, it targets `/files/${item.id}/restore`.
 *
 * The backend handles the logic of removing the deletion flag and updating the item's parent
 * relationships if necessary. The function returns a boolean indicating the success of the operation.
 * A failure during the network request is caught, logged to the console, and returns `false`.
 *
 * @param {Object} item - The normalized trash item object to be restored. Must contain `type` and `id` properties.
 * @returns {Promise<boolean>} A promise resolving to `true` if the restoration was successful, or `false` if it failed.
 */
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

/**
 * Permanently deletes a specific file or folder from the system.
 *
 * Unlike moving an item to the trash, this action is irreversible. The function inspects the
 * `item`'s type to route an HTTP DELETE request to either `/folders/${item.id}` or `/files/${item.id}`.
 *
 * If the deletion is successfully confirmed by the backend, the function dispatches a global
 * `storageUpdated` event to the `window`. This event acts as a signal for other application
 * components (like storage quotas or file lists) to re-fetch their data and update their state.
 * It returns a boolean indicating the success or failure of the operation.
 *
 * @param {Object} item - The normalized trash item object targeted for permanent deletion. Needs `type` and `id`.
 * @returns {Promise<boolean>} A promise resolving to `true` on successful deletion, or `false` on error.
 */
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

/**
 * Permanently deletes all items currently located in the trash.
 *
 * This function triggers a bulk permanent deletion. It uses `Promise.all` to simultaneously
 * send HTTP DELETE requests to the `/folders/trash/empty` and `/files/trash/empty` endpoints.
 *
 * By emptying the trash in a single coordinated action, it ensures atomic-like behavior from 
 * the frontend's perspective. Upon successful completion of both requests, it dispatches the
 * `storageUpdated` event to notify the rest of the application that storage space has been freed
 * and UI components should synchronize. Errors are caught and result in a `false` return value.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the trash was successfully emptied, or `false` otherwise.
 */
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

/**
 * Formats a given date value into a human-readable "time ago" string or a localized date format.
 *
 * This utility enhances the user experience in the Trash view by providing context-sensitive 
 * timestamps. It takes a raw date string or timestamp and compares it to the current time.
 * 
 * - If the date is invalid or missing, it defaults to "Just now".
 * - If the difference is less than a minute, it returns "Just now".
 * - If the difference is less than an hour, it returns a string like "5 mins ago".
 * - If the difference is less than 24 hours, it returns a string like "3 hours ago".
 * - If the date is older than 24 hours, it falls back to a standard "MMM D, YYYY" format 
 *   using `toLocaleDateString`.
 *
 * @param {string|number|Date} dateValue - The raw date value to be formatted.
 * @returns {string} The formatted, human-readable date string.
 */
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

