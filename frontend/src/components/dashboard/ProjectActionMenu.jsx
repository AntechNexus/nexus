import React, { useEffect, useRef } from "react";

const baseActions = [
  { id: "open", label: "Open Project" },
  { id: "edit", label: "Edit Project", requiresOwner: true },
  { id: "teams", label: "Manage Teams", requiresOwner: true },
  { id: "trash", label: "Delete Project", danger: true, requiresOwner: true },
];

/**
 * ProjectActionMenu component renders a dropdown menu containing various contextual actions 
 * that can be performed on a specific project, such as opening, editing, or deleting it.
 * 
 * This component does not manage internal state but relies on a ref to detect outside clicks. 
 * Its primary side effect is the registration of event listeners on the document for both 
 * pointer down events (to detect clicks outside the menu) and key down events (to detect 
 * the 'Escape' key). These listeners ensure the menu closes appropriately when the user 
 * interacts elsewhere or attempts to dismiss it via the keyboard.
 * 
 * When rendered, it calculates which actions are available based on whether the current 
 * user is the owner of the project. It returns a floating, absolutely positioned container 
 * with a list of interactive buttons for each allowed action. Danger actions are styled 
 * appropriately in red to indicate their destructive nature.
 *
 * @param {Object} props - Component props.
 * @param {Function} props.onAction - Callback function triggered when an action item is clicked, passing the action ID.
 * @param {Function} props.onClose - Callback function triggered to close the menu (e.g., on outside click or Escape key).
 * @param {boolean} props.isOwner - Boolean flag indicating if the current user is the owner of the project, determining which actions are visible.
 * @returns {JSX.Element} The JSX structure representing the dropdown menu container and its action items.
 */
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
