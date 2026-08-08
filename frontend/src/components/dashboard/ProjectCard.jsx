import React from "react";
import { FileText, Folder, MoreVertical, Plus } from "lucide-react";
import ProjectActionMenu from "./ProjectActionMenu";

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
            className={`flex h-7 w-7 items-center justify-center rounded-full border border-white text-[10px] font-bold ${member.tone}`}
            key={member.name}
            title={member.name}
          >
            {member.initials}
          </span>
        ))}
      </div>
      <div className="text-right text-[10px] font-semibold text-slate-500">
        <span className="flex items-center justify-end gap-1">
          <FileText size={12} /> {project.fileCount ?? 0} Files
        </span>
        <span>{project.updatedLabel || "Updated just now"}</span>
      </div>
    </div>
  </article>
  );
};

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
