import React, { useState, useEffect } from "react";
import { Folder, X, AlertCircle } from "lucide-react";
import { fetchProjectDocuments } from "../../services/projectDetailApi";

const buildFolderHierarchy = (docs, excludeId = null) => {
  const folders = docs.filter(d => d.type === "folder" && d.id !== excludeId);
  const folderMap = new Map();
  folders.forEach(f => folderMap.set(f.id, { ...f, children: [] }));
  
  const rootFolders = [];
  folderMap.forEach(folder => {
    // We only attach to parent if parent exists in our map 
    // (if parent was excluded or doesn't exist, it becomes a root in this view)
    if (folder.parentId && folderMap.has(folder.parentId)) {
       folderMap.get(folder.parentId).children.push(folder);
    } else {
       rootFolders.push(folder);
    }
  });

  const flattened = [];
  const traverse = (node, depth) => {
    flattened.push({ ...node, depth });
    node.children.forEach(child => traverse(child, depth + 1));
  };
  rootFolders.forEach(root => traverse(root, 0));
  
  return flattened;
};

/**
 * MoveDocumentModal component responsible for displaying a modal interface to move a specific document
 * or folder into another folder within the same project. It provides a hierarchical view of available 
 * destination folders, ensuring users have clear context about where their document is going.
 * 
 * The component maintains several pieces of state: the list of folders formatted into a hierarchy, 
 * a loading state to indicate data fetching progress, and the currently selected destination folder ID. 
 * As a side effect, when the modal opens and a projectId is provided, it triggers an API call to fetch 
 * all project documents. These documents are then processed to build a folder tree, specifically excluding 
 * the document currently being moved to prevent circular nesting.
 * 
 * When rendered, it displays an overlay backdrop and a centered modal dialog. Inside the dialog, 
 * it shows a loading spinner during data fetch, and subsequently renders a scrollable list of 
 * indented folder options representing the hierarchy. It includes 'Cancel' and 'Move' buttons, 
 * disabling the 'Move' button if the selection is invalid (e.g., trying to move to the same parent).
 *
 * @param {Object} props - Component props.
 * @param {boolean} props.isOpen - Determines whether the modal is visible on screen.
 * @param {Function} props.onClose - Callback function triggered to close the modal.
 * @param {Object} props.documentToMove - The document or folder object that is intended to be moved.
 * @param {string} props.projectId - The unique identifier of the project, used to fetch the folder list.
 * @param {Function} props.onMove - Callback function executed when the user confirms the move action, passing the document and target folder ID.
 * @returns {JSX.Element|null} The JSX structure representing the modal overlay and dialog, or null if isOpen is false.
 */
export default function MoveDocumentModal({ isOpen, onClose, documentToMove, projectId, onMove }) {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  useEffect(() => {
    if (isOpen && projectId) {
      setIsLoading(true);
      fetchProjectDocuments(projectId)
        .then((docs) => {
          const hierarchicalFolders = buildFolderHierarchy(docs, documentToMove?.id);
          setFolders(hierarchicalFolders);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
      
      // Default selection to its current parent or root
      setSelectedFolderId(documentToMove?.parentId || "root");
    }
  }, [isOpen, projectId, documentToMove]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // If selected root, we pass null
    const targetId = selectedFolderId === "root" ? null : selectedFolderId;
    onMove(documentToMove, targetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in zoom-in-95 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800">Move to...</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-nexus-primary"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Select destination for <strong>{documentToMove?.name}</strong>:
        </p>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-nexus-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="mb-6 max-h-60 overflow-y-auto rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedFolderId("root")}
              className={`flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${
                selectedFolderId === "root" ? "bg-blue-50 text-nexus-primary" : "text-slate-700"
              }`}
            >
              <Folder size={18} className={selectedFolderId === "root" ? "text-nexus-primary" : "text-slate-400"} />
              <span className="font-semibold text-sm">Project Root</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${
                  selectedFolderId === folder.id ? "bg-blue-50 text-nexus-primary" : "text-slate-700"
                }`}
                style={{ paddingLeft: `calc(0.75rem + ${folder.depth * 1.5}rem)` }}
              >
                <Folder size={18} className={selectedFolderId === folder.id ? "text-nexus-primary" : "text-slate-400"} />
                <span className="font-semibold text-sm">{folder.name}</span>
              </button>
            ))}
            {folders.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">
                No folders available.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || selectedFolderId === documentToMove?.parentId || (documentToMove?.parentId === null && selectedFolderId === "root")}
            className="rounded-xl bg-nexus-primary px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-nexus-action disabled:opacity-50 disabled:shadow-none"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
