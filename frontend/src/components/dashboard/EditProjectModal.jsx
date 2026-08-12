import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Renders a modal dialog interface for editing an existing project's details.
 *
 * This component provides a focused environment for the user to modify the title and description of a project.
 * It is rendered as an overlay on top of the current view, requiring the user to either save their changes or
 * cancel out of the modal to return to the main interface.
 *
 * Internally, it manages controlled form state for `name` and `description` input fields, initializing them with
 * values from the provided `project` prop. It also maintains an `errors` state object to track and display
 * validation messages for individual fields or general submission failures. A `useEffect` hook ensures the form
 * state remains synchronized if the `project` prop changes while the modal is mounted, and another `useEffect`
 * sets up a global keyboard listener to close the modal when the "Escape" key is pressed.
 *
 * Upon form submission, the component triggers the `onSave` asynchronous prop function. It handles potential
 * validation errors returned from this function (presumably originating from a backend API call) and updates
 * the local error state to provide immediate visual feedback to the user without altering the underlying data
 * until a successful response is received.
 *
 * @param {Object} props - The properties object passed to this component.
 * @param {Function} props.onClose - Callback function triggered to close the modal without saving (e.g., clicking Cancel, the X button, or pressing Escape).
 * @param {Function} props.onSave - Asynchronous callback function invoked with the updated project object when the form is submitted. Expected to return a status indicating success or failure.
 * @param {Object} props.project - The project object containing the initial data to populate the form fields.
 * @param {string} props.project.title - The current title of the project.
 * @param {string} props.project.description - The current description of the project.
 * @returns {JSX.Element|null} The rendered modal overlay and form container, or `null` if no project prop is provided.
 */
const EditProjectModal = ({ onClose, onSave, project }) => {
  const [name, setName] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setName(project?.title ?? "");
    setDescription(project?.description ?? "");
    setErrors({});
  }, [project]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Project name cannot be empty." });
      return;
    }
    const res = await onSave({
      ...project,
      title: name.trim(),
      description: description.trim(),
    });
    if (res && res.success === false) {
      const err = res.error;
      if (err.response?.data?.validationErrors) {
        setErrors(err.response.data.validationErrors);
      } else {
        setErrors({
          general: err.response?.data?.message || "Failed to update project.",
        });
      }
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-nexus-text">
            Edit Project
          </h2>
          <button
            aria-label="Close edit project modal"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <label className="mb-4 block text-sm font-medium text-slate-600">
          Project Name
          <div className="relative mt-1">
            <input
              maxLength={75}
              className={`h-11 w-full rounded-xl border px-3 pr-16 text-sm text-nexus-text outline-none transition focus:ring-4 focus:ring-blue-100 ${
                errors.name
                  ? "border-red-400 focus:border-red-500"
                  : "border-nexus-border focus:border-nexus-primary"
              }`}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((prev) => ({ ...prev, name: null }));
              }}
              value={name}
            />
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
              {name.length}/75
            </div>
          </div>
        </label>
        {errors.name && (
          <p className="-mt-2 mb-4 text-sm font-semibold text-red-600">
            {errors.name}
          </p>
        )}
        {errors.general && (
          <p className="-mt-2 mb-4 text-sm font-semibold text-red-600">
            {errors.general}
          </p>
        )}
        <label className="mb-6 block text-sm font-medium text-slate-600">
          Project Description
          <div className="relative mt-1">
            <textarea
              maxLength={200}
              className={`h-24 w-full resize-none rounded-xl border p-3 pb-8 text-sm text-nexus-text outline-none transition focus:ring-4 focus:ring-blue-100 ${
                errors.description
                  ? "border-red-400 focus:border-red-500"
                  : "border-nexus-border focus:border-nexus-primary"
              }`}
              onChange={(event) => {
                setDescription(event.target.value);
                setErrors((prev) => ({ ...prev, description: null }));
              }}
              value={description}
            />
            <div className="pointer-events-none absolute bottom-2 right-3 text-xs text-slate-400">
              {description.length}/200
            </div>
          </div>
        </label>
        {errors.description && (
          <p className="-mt-2 mb-6 text-sm font-semibold text-red-600">
            {errors.description}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            className="rounded-xl px-4 py-2 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-nexus-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
            type="submit"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProjectModal;
