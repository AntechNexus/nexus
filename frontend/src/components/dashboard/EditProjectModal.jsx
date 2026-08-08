import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const EditProjectModal = ({ onClose, onSave, project }) => {
  const [name, setName] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(project?.title ?? "");
    setDescription(project?.description ?? "");
    setError("");
  }, [project]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Project name cannot be empty.");
      return;
    }
    onSave({ ...project, title: name.trim(), description: description.trim() });
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-nexus-text">Edit Project</h2>
          <button aria-label="Close edit project modal" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <label className="mb-4 block text-sm font-medium text-slate-600">
          Project Name
          <input
            className="mt-1 h-11 w-full rounded-xl border border-nexus-border px-3 text-sm text-nexus-text outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            value={name}
          />
        </label>
        {error && <p className="-mt-2 mb-4 text-sm text-red-600">{error}</p>}
        <label className="mb-6 block text-sm font-medium text-slate-600">
          Project Description
          <textarea
            className="mt-1 h-24 w-full resize-none rounded-xl border border-nexus-border p-3 text-sm text-nexus-text outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button className="rounded-xl px-4 py-2 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded-xl bg-nexus-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2" type="submit">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProjectModal;
