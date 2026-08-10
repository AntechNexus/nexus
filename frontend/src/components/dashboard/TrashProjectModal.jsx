import React, { useEffect } from "react";
import { Trash2 } from "lucide-react";

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
