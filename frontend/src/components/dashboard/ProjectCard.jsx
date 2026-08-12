import React from "react";
import { FileText, Folder, MoreVertical, Plus } from "lucide-react";
import ProjectActionMenu from "./ProjectActionMenu";

const getRelativeTime = (dateString) => {
  if (!dateString) return "Updated just now";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Updated just now";
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return "Updated just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Updated ${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Updated ${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `Updated ${diffInDays}d ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `Updated ${diffInMonths}mo ago`;
  
  return `Updated ${Math.floor(diffInMonths / 12)}y ago`;
};
/**
 * ProjectCard component displays a summary card for a specific project within the dashboard. 
 * It serves as an interactive element allowing users to select, navigate to, or perform 
 * contextual actions on the project through an integrated action menu.
 * 
 * This component operates statelessly regarding its own display but relies heavily on 
 * props to determine its interactive behavior and visual state (e.g., whether it is selected 
 * or if its action menu is open). There are no direct side effects managed within this component; 
 * all interactions delegate to the provided callback props.
 * 
 * On render, it outputs an interactive article element styled as a card. It includes 
 * an icon header, an options button that toggles the `ProjectActionMenu`, the project's title 
 * and description, and a footer displaying member avatars, file count, and a relative timestamp 
 * of its last update. Styling conditionally applies focus rings, hover transformations, 
 * and selected states.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.currentUser - The currently authenticated user object, used to determine ownership permissions.
 * @param {boolean} props.menuOpen - Boolean indicating whether the action menu for this specific card is currently open.
 * @param {Function} props.onMenuAction - Callback function triggered when an action from the action menu is selected.
 * @param {Function} props.onNavigate - Callback function triggered when the card is double-clicked or activated via the Enter key.
 * @param {Function} props.onSelect - Callback function triggered when the card is clicked or activated via the Space key to mark it as selected.
 * @param {Function} props.onToggleMenu - Callback function triggered when the more options icon is clicked to toggle the action menu visibility.
 * @param {Object} props.project - The project data object containing details like title, description, members, and timestamps.
 * @param {boolean} props.selected - Boolean flag indicating if this project card is currently selected by the user.
 * @returns {JSX.Element} The JSX structure representing the interactive project card.
 */
const ProjectCard = ({ currentUser, menuOpen, onMenuAction, onNavigate, onSelect, onToggleMenu, project, selected }) => {
  const hasLongDescription = project.description && project.description.length > 86;
  const createdById = project.createdBy?._id || project.createdBy?.id || project.createdBy;
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwner = createdById && currentUserId && String(createdById) === String(currentUserId);

  return (
    <article
      className={`group flex min-h-[272px] cursor-pointer flex-col rounded-xl border bg-white p-5 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 ${
        selected ? "border-nexus-primary bg-blue-50/30 shadow-[0_16px_30px_rgba(0,50,196,0.12)]" : "border-nexus-border"
      }`}
      onClick={() => onSelect?.(project.id)}
      onDoubleClick={() => onNavigate(project.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onNavigate(project.id);
        if (event.key === " ") {
          event.preventDefault();
          onSelect?.(project.id);
        }
      }}
      tabIndex={0}
    >
    <div className="mb-6 flex items-start justify-between gap-4">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-nexus-primary">
        <Folder size={26} />
      </span>
      <div className="relative">
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Open actions for ${project.title}`}
          className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu(project.id);
          }}
          type="button"
        >
          <MoreVertical size={20} />
        </button>
        {menuOpen && <ProjectActionMenu isOwner={isOwner} onAction={(action) => onMenuAction(action, project)} onClose={() => onToggleMenu(null)} />}
      </div>
    </div>

    <h3 className="mb-1 text-base font-bold text-nexus-text transition group-hover:text-nexus-primary">{project.title}</h3>
    <div className="mb-6 min-h-[58px]">
      <p className="line-clamp-2 text-sm leading-5 text-nexus-muted">{project.description}</p>
      {hasLongDescription && <span className="mt-1 inline-block text-xs font-bold text-nexus-primary">Show more</span>}
    </div>
    <div className="mt-auto flex items-end justify-between">
      <div className="flex -space-x-1.5">
        {project.members.map((member) => (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border border-white text-xs font-bold ${member.tone}`}
            key={member.name}
            title={member.name}
          >
            {member.initials}
          </span>
        ))}
      </div>
      <div className="text-right text-xs font-semibold text-slate-500">
        <span className="flex items-center justify-end gap-1">
          <FileText size={12} /> {project.fileCount ?? 0} Files
        </span>
        <span>{project.updatedLabel || getRelativeTime(project.updatedAt)}</span>
      </div>
    </div>
  </article>
  );
};

/**
 * NewProjectCard component provides a visual entry point for users to create a new project. 
 * It is styled consistently with the ProjectCard but uses dashed borders and placeholder 
 * iconography to indicate an empty state or addition action.
 * 
 * This component is purely presentational and holds no internal state. It triggers no side 
 * effects.
 * 
 * Upon rendering, it returns a styled button element containing a prominent plus icon 
 * and text prompting the user to start a new project workspace. It integrates standard 
 * hover and focus states for accessibility.
 *
 * @param {Object} props - Component props.
 * @param {Function} props.onClick - Callback function executed when the card is clicked to initiate the creation process.
 * @returns {JSX.Element} The JSX structure representing the interactive button for creating a new project.
 */
export const NewProjectCard = ({ onClick }) => (
  <button
    className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-transparent p-6 text-center text-slate-500 transition hover:border-nexus-primary hover:bg-blue-50/50 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
    onClick={onClick}
    type="button"
  >
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-300 transition group-hover:border-nexus-primary">
      <Plus size={28} />
    </span>
    <span className="text-base font-semibold">New Project</span>
    <span className="mt-1 text-sm">Start a fresh project workspace</span>
  </button>
);

export default ProjectCard;
