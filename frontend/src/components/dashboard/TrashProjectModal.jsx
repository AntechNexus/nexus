import React, { useEffect } from "react";
import { Trash2 } from "lucide-react";

/**
 * Renders a confirmation modal dialog prompting the user before moving a project to the trash.
 * 
 * This modal acts as a critical safety mechanism to prevent accidental deletion or archiving of projects.
 * It overlays the main application interface with a backdrop and captures user focus. 
 * The component leverages a side effect to listen for the 'Escape' key, allowing users to easily 
 * dismiss the modal via keyboard navigation, enhancing accessibility and user experience. 
 * 
 * The modal explicitly asks for confirmation to move the specified project out of the active workspace.
 * It conditionally renders nothing if no project is provided, avoiding blank or invalid dialogs.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {Function} props.onClose - The callback function triggered when the user clicks 'Cancel' or presses the 'Escape' key, used to close the modal without taking action.
 * @param {Function} props.onConfirm - The callback function triggered when the user clicks the 'Move to Trash' button, used to execute the deletion logic.
 * @param {Object} props.project - The project object targeted for deletion. The modal only renders if this prop is truthy.
 * @returns {JSX.Element|null} A fixed-position modal overlay containing confirmation details and action buttons, or null if no project is targeted.
 */
const TrashProjectModal = ({ onClose, onConfirm, project }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3 text-red-600">
          <Trash2 size={26} />
          <h2 className="text-xl font-semibold">Move this project to Trash?</h2>
        </div>
        <p className="mb-6 text-sm leading-6 text-slate-600">
          The project will be removed from your active workspace.
        </p>
        <div className="flex justify-end gap-3">
          <button className="rounded-xl px-4 py-2 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2" onClick={onConfirm} type="button">
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashProjectModal;
