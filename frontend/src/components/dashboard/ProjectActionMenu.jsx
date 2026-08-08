import React, { useEffect, useRef } from "react";

const baseActions = [
  { id: "open", label: "Open Project" },
  { id: "edit", label: "Edit Project", requiresOwner: true },
  { id: "teams", label: "Manage Teams", requiresOwner: true },
  { id: "trash", label: "Delete Project", danger: true, requiresOwner: true },
];

const ProjectActionMenu = ({ onAction, onClose, isOwner }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const actions = baseActions.filter(a => !a.requiresOwner || isOwner);

  return (
    <div
      className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-nexus-border bg-white py-2 shadow-xl"
      onClick={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
    >
      {actions.map((action) => (
        <button
          className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${action.danger ? "text-red-600" : "text-nexus-text"}`}
          key={action.id}
          onClick={() => onAction(action.id)}
          role="menuitem"
          type="button"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default ProjectActionMenu;
