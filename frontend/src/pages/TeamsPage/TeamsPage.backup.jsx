import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Folder,
  Globe2,
  MoreVertical,
  PlusCircle,
  Search,
  SortAsc,
  Trash2,
  X,
} from "lucide-react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import { getProjects, moveProjectToTrash, updateProject } from "../../services/projectApi";

const fallbackTeamProjects = [
  {
    id: "global-expansion",
    title: "Global Expansion",
    updatedLabel: "Updated 1d ago",
    iconTone: "bg-blue-50 text-nexus-primary",
    members: [
      { id: "elena-rodriguez", name: "Elena Rodriguez", role: "Strategy Lead", permission: "Owner", tone: "bg-blue-100 text-nexus-primary" },
      { id: "marcus-thorne", name: "Marcus Thorne", role: "Global Consultant", permission: "Editor", tone: "bg-emerald-100 text-emerald-700" },
    ],
  },
  {
    id: "ai-localization-v2",
    title: "AI Localization v2",
    updatedLabel: "Updated 4h ago",
    iconTone: "bg-pink-50 text-nexus-ai",
    members: [
      { id: "nina-patel", name: "Nina Patel", role: "Product Manager", permission: "Owner", tone: "bg-pink-100 text-nexus-ai" },
      { id: "owen-hart", name: "Owen Hart", role: "Localization Engineer", permission: "Editor", tone: "bg-indigo-100 text-indigo-700" },
    ],
  },
  {
    id: "q4-financial-reports",
    title: "Q4 Financial Reports",
    updatedLabel: "Updated 2h ago",
    iconTone: "bg-indigo-50 text-indigo-700",
    members: [
      { id: "sarah-jenkins", name: "Sarah Jenkins", role: "Lead Analyst", permission: "Admin", tone: "bg-amber-100 text-amber-700" },
      { id: "jordan-smith", name: "Jordan Smith", role: "Reviewer", permission: "Viewer", tone: "bg-slate-100 text-slate-700" },
    ],
  },
];

const suggestedMember = {
  id: "jordan-smith",
  name: "Jordan Smith",
  email: "jordan.s@nexus.ai",
  role: "Collaborator",
  tone: "bg-violet-100 text-violet-700",
};

const sortOptions = [
  { label: "Project Name A-Z", value: "name-asc" },
  { label: "Project Name Z-A", value: "name-desc" },
  { label: "Most Members", value: "members-desc" },
  { label: "Fewest Members", value: "members-asc" },
  { label: "Last Updated", value: "updated-desc" },
];

/**
 * readStoredJson Function
 * 
 * A utility function that parses JSON data from localStorage, providing a safe fallback.
 * 
 * @param {string} key - The localStorage key to read.
 * @returns {Object} The parsed JSON object, or an empty object if parsing fails.
 */
const readStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
};

/**
 * getCurrentProfile Function
 * 
 * A utility function that retrieves the current user profile from local storage.
 * Used in the backup prototype mode to identify the owner.
 * 
 * @returns {Object} The current user's profile information object.
 */
const getCurrentProfile = () => {
  const storedProfile = readStoredJson("nexusOnboardingProfile");
  const storedAccount = readStoredJson("nexusPrototypeAccount");
  return {
    id: "current-user",
    name: storedProfile.fullName || storedAccount.fullName || "Alex Carter",
    role: storedProfile.role || "Project Owner",
    permission: "Owner",
    tone: "bg-blue-100 text-nexus-primary",
  };
};

/**
 * initials Function
 * 
 * A utility function that computes user initials from their full name.
 * It splits the name by spaces, takes the first character of up to the first two words, and capitalizes them.
 * 
 * @param {string} name - The full name of the user.
 * @returns {string} The computed initials (e.g., "JD" for "Jane Doe").
 */
const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

/**
 * normalizeTeamProject Function
 * 
 * A utility function that normalizes a project object, ensuring a standardized shape for rendering.
 * It assigns default icon tones and prepends the owner profile to the members list.
 * 
 * @param {Object} project - The raw project object.
 * @param {number} index - The index of the project in the list.
 * @param {Object} ownerProfile - The owner's profile object.
 * @returns {Object} The normalized project object.
 */
const normalizeTeamProject = (project, index, ownerProfile) => {
  const collaborators =
    project.members
      ?.filter((member) => member.id !== ownerProfile.id && member.permission !== "Owner")
      .map((member, memberIndex) => ({
        id: member.id || member.name.toLowerCase().replace(/\s+/g, "-"),
        name: member.name,
        role: member.role || "Collaborator",
        tone: member.tone || ["bg-pink-100 text-nexus-ai", "bg-emerald-100 text-emerald-700", "bg-indigo-100 text-indigo-700"][memberIndex % 3],
      })) ?? [];

  return {
    ...project,
    iconTone: project.iconTone || (index % 2 === 0 ? "bg-blue-50 text-nexus-primary" : "bg-pink-50 text-nexus-ai"),
    members: [ownerProfile, ...collaborators],
  };
};

/**
 * sortProjects Function
 * 
 * A utility function that sorts an array of project objects based on a specified sorting criteria.
 * It handles sorting by project title (alphabetical ascending/descending), number of members (ascending/descending), and last updated date.
 * 
 * @param {Array} projectList - The list of projects to sort.
 * @param {string} sortMode - The current sorting mode selected by the user.
 * @returns {Array} A new array containing the sorted projects.
 */
const sortProjects = (projectList, sortMode) =>
  [...projectList].sort((firstProject, secondProject) => {
    if (sortMode === "name-desc") return secondProject.title.localeCompare(firstProject.title);
    if (sortMode === "members-desc") return secondProject.members.length - firstProject.members.length;
    if (sortMode === "members-asc") return firstProject.members.length - secondProject.members.length;
    if (sortMode === "updated-desc") return firstProject.updatedLabel.localeCompare(secondProject.updatedLabel);
    return firstProject.title.localeCompare(secondProject.title);
  });

/**
 * ProjectAvatarStack Component
 * 
 * Renders a visual stack of circular avatars representing the members of a project.
 * It displays up to three distinct member initials, and if there are more than three members, it appends a badge indicating the count of remaining members (e.g., "+2").
 * 
 * It manages no state and causes no side effects.
 * 
 * @param {Object} props - The component props.
 * @param {Array} props.members - The list of member objects containing their name, tone styling, and IDs.
 * @returns {JSX.Element} An overlapping stack of member avatars.
 */
const ProjectAvatarStack = ({ members }) => (
  <div className="flex -space-x-2">
    {members.slice(0, 3).map((member) => (
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold ${member.tone}`}
        key={member.id}
      >
        {initials(member.name)}
      </span>
    ))}
    {members.length > 3 && (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600">
        +{members.length - 3}
      </span>
    )}
  </div>
);

/**
 * ProjectMenu Component
 * 
 * A dropdown menu component for individual projects that provides quick access to actions such as renaming or deleting a project.
 * It only renders its contents when the `open` prop is true.
 * 
 * It does not maintain its own state but relies on its parent to control its visibility and handle the action callbacks.
 * 
 * @param {Object} props - The component props.
 * @param {Function} props.onDelete - The callback function triggered when the "Delete" option is clicked.
 * @param {Function} props.onRename - The callback function triggered when the "Rename" option is clicked.
 * @param {boolean} props.open - Whether the menu is currently visible.
 * @returns {JSX.Element|null} The absolute positioned dropdown menu, or null if closed.
 */
const ProjectMenu = ({ onDelete, onRename, open }) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-nexus-border bg-white py-1 text-sm shadow-xl">
      <button
        className="block w-full px-3 py-2 text-left font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary"
        onClick={onRename}
        type="button"
      >
        Rename
      </button>
      <button
        className="block w-full px-3 py-2 text-left font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </div>
  );
};

/**
 * SortMenu Component
 * 
 * A dropdown menu component that presents available sorting options for the project list.
 * It iterates through predefined `sortOptions` and renders a selectable list of buttons. The currently active sort option is highlighted.
 * 
 * @param {Object} props - The component props.
 * @param {Function} props.onSelect - The callback function triggered when a sort option is selected, passing the selected value.
 * @param {boolean} props.open - Whether the sorting menu is currently visible.
 * @param {string} props.selectedSort - The value of the currently active sorting mode.
 * @returns {JSX.Element|null} The absolute positioned sort dropdown menu, or null if closed.
 */
const SortMenu = ({ onSelect, open, selectedSort }) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-nexus-border bg-white py-1 text-sm shadow-xl">
      {sortOptions.map((option) => (
        <button
          className={`block w-full px-3 py-2 text-left font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary ${
            selectedSort === option.value ? "text-nexus-primary" : "text-slate-700"
          }`}
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

/**
 * RenameProjectModal Component
 * 
 * A modal dialog that allows users to rename an existing project.
 * It maintains local state for the new project name input and any validation errors that occur during the submission process.
 * 
 * Side effects:
 * - Resets the name input and clears errors whenever the `project` prop changes (i.e., when the modal opens for a specific project).
 * - Attaches a 'keydown' event listener to the document to allow closing the modal by pressing the Escape key.
 * - On form submission, it validates that the name is not empty, invokes the `onSave` callback, and processes any errors returned by the API call.
 * 
 * @param {Object} props - The component props.
 * @param {Function} props.onClose - The callback function to close the modal without saving.
 * @param {Function} props.onSave - The callback function to submit the new project name. Expected to return a promise.
 * @param {Object|null} props.project - The project object currently being renamed. If null, the modal does not render.
 * @returns {JSX.Element|null} The rename project modal overlay, or null if no project is provided.
 */
const RenameProjectModal = ({ onClose, onSave, project }) => {
  const [name, setName] = useState(project?.title ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(project?.title ?? "");
    setError("");
  }, [project]);

  useEffect(() => {
    if (!project) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Project name cannot be empty.");
      return;
    }
    onSave(name.trim());
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <form className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-nexus-text">Rename Project</h2>
          <button aria-label="Close rename project modal" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <label className="mb-2 block text-sm font-medium text-slate-600">
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
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
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

/**
 * DeleteProjectModal Component
 * 
 * A confirmation modal that prompts the user before permanently deleting a project.
 * It warns the user that the project will be removed from their active workspace.
 * 
 * Side effects:
 * - Attaches a 'keydown' event listener to the document to allow closing the modal by pressing the Escape key.
 * 
 * @param {Object} props - The component props.
 * @param {Function} props.onClose - The callback function to close the modal without deleting.
 * @param {Function} props.onConfirm - The callback function to execute the deletion.
 * @param {Object|null} props.project - The project object targeted for deletion. If null, the modal does not render.
 * @returns {JSX.Element|null} The deletion confirmation modal overlay, or null if no project is provided.
 */
const DeleteProjectModal = ({ onClose, onConfirm, project }) => {
  useEffect(() => {
    if (!project) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={26} />
        </div>
        <h2 className="text-xl font-semibold text-nexus-text">Delete this project?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {project.title} will be removed from your active workspace view.
        </p>
        <div className="mt-6 flex justify-stretch gap-3">
          <button className="flex-1 rounded-xl border border-nexus-border px-4 py-2.5 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2" onClick={onConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * AddMemberModal Component
 * 
 * A modal dialog for searching and adding new members to a project.
 * It manages local state for the selection of a suggested member.
 * 
 * Side effects:
 * - Attaches an Escape key listener to close the modal.
 * 
 * @param {Object} props - The component props.
 * @param {Function} props.onAdd - The callback function triggered to add the selected user to the project.
 * @param {Function} props.onClose - The callback function to close the modal.
 * @param {Object|null} props.project - The project object to which members are being added. If null, the modal does not render.
 * @returns {JSX.Element|null} The add member modal overlay, or null if no project is provided.
 */
const AddMemberModal = ({ onAdd, onClose, project }) => {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    if (!project) return undefined;
    setSelected(false);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, project]);

  if (!project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-nexus-border p-6">
          <h2 className="text-xl font-semibold text-nexus-text">Add members</h2>
          <button aria-label="Close add member modal" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6 p-6">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="h-12 w-full rounded-xl border border-nexus-border bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100" placeholder="Search by name or email" />
          </label>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-nexus-muted">Suggested</p>
            <div className="flex items-center justify-between rounded-xl border border-nexus-border p-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${suggestedMember.tone}`}>
                  {initials(suggestedMember.name)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-nexus-text">{suggestedMember.name}</p>
                  <p className="text-xs text-nexus-muted">{suggestedMember.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary ${
                    selected ? "bg-slate-100 text-slate-700" : "bg-nexus-primary text-white hover:bg-nexus-action"
                  }`}
                  onClick={() => setSelected((current) => !current)}
                  type="button"
                >
                  {selected ? "Selected" : "Add"}
                </button>
              </div>
            </div>
          </div>
          {selected && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-nexus-muted">To be added</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-nexus-border bg-slate-50 py-1 pl-2 pr-1 text-xs font-medium text-slate-700">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${suggestedMember.tone}`}>
                  {initials(suggestedMember.name)}
                </span>
                {suggestedMember.name}
                <button aria-label="Remove selected member" className="rounded-full p-1 text-slate-500 transition hover:bg-white hover:text-red-600" onClick={() => setSelected(false)} type="button">
                  <X size={13} />
                </button>
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-nexus-border bg-slate-50 p-6">
          <button className="rounded-xl px-4 py-2.5 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="rounded-xl bg-nexus-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-nexus-action disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
            disabled={!selected}
            onClick={() => onAdd(suggestedMember)}
            type="button"
          >
            Add Members
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * RemoveMemberModal Component
 * 
 * A confirmation modal that ensures the user actually wants to revoke a member's access to a project.
 * It displays the target member's details and a warning about the consequences of the action.
 * 
 * Side effects:
 * - Attaches an Escape key listener to close the modal.
 * 
 * @param {Object} props - The component props.
 * @param {Object|null} props.member - The member object targeted for removal.
 * @param {Function} props.onClose - The callback function to dismiss the modal without taking action.
 * @param {Function} props.onConfirm - The callback function to confirm and execute the removal.
 * @param {Object|null} props.project - The project from which the member is being removed.
 * @returns {JSX.Element|null} The removal confirmation modal overlay, or null if either `member` or `project` is missing.
 */
const RemoveMemberModal = ({ member, onClose, onConfirm, project }) => {
  useEffect(() => {
    if (!member) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [member, onClose]);

  if (!member || !project) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="p-8 text-center">
          <span className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-sm font-bold ${member.tone}`}>
            {initials(member.name)}
          </span>
          <h2 className="text-lg font-bold text-nexus-text">{member.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            They will lose all access to the <span className="font-semibold text-nexus-text">{project.title}</span> project documents and communication.
          </p>
        </div>
        <div className="flex gap-3 border-t border-nexus-border bg-slate-50 p-6">
          <button className="flex-1 rounded-xl border border-nexus-border bg-white px-4 py-3 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2" onClick={onConfirm} type="button">
            Remove Member
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * TeamsPage Component
 * 
 * The workspace settings and member management interface (Backup/Prototype Version).
 * Responsibilities:
 * - Displays all users within a project.
 * - Handles local state updates for renaming, deleting, adding, and removing members.
 * 
 * State managed:
 * - `sidebarCollapsed`, `mobileSidebarOpen`: UI states for the navigation layout.
 * - `projects`: Array of local project data.
 * - UI visibility states: `openProjectIds`, `openMenuProjectId`, `sortOpen`, and modal targets.
 * - `sortMode`: The active sorting criteria for the projects list.
 * - `toast`: Temporary notification messages for feedback on actions.
 * 
 * Side effects:
 * - Loads mock/local project data on mount.
 * - Listens to pointerdown and keydown events for closing dropdown menus and modals.
 * - Modifies projects array locally and syncs to prototype storage.
 * 
 * @returns {JSX.Element} The complete team management page including the sidebar, header, project list, and various management modals.
 */
const TeamsPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [openProjectIds, setOpenProjectIds] = useState(["global-expansion"]);
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);
  const [addMemberProject, setAddMemberProject] = useState(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);
  const [renameProject, setRenameProject] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);
  const [sortMode, setSortMode] = useState("name-asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [toast, setToast] = useState("");
  const menuRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const storedProjects = getProjects();
    const sourceProjects = storedProjects.length > 0 ? storedProjects : fallbackTeamProjects;
    const ownerProfile = getCurrentProfile();
    const normalizedProjects = sourceProjects.map((project, index) => normalizeTeamProject(project, index, ownerProfile));
    setProjects(normalizedProjects);
    setOpenProjectIds([normalizedProjects[0]?.id].filter(Boolean));
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuProjectId(null);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenuProjectId(null);
        setSortOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleProject = (projectId) => {
    setOpenProjectIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  };

  const visibleProjects = useMemo(() => sortProjects(projects, sortMode), [projects, sortMode]);
  const activeSortLabel = sortOptions.find((option) => option.value === sortMode)?.label ?? "Project Name A-Z";

  const syncProject = (projectId, updates) => {
    try {
      updateProject(projectId, updates);
    } catch {
      // Local prototype data may not exist in storage yet.
    }
  };

  const handleRenameProject = (name) => {
    if (!renameProject) return;
    setProjects((current) =>
      current.map((project) =>
        project.id === renameProject.id ? { ...project, title: name, updatedLabel: "Updated just now" } : project,
      ),
    );
    syncProject(renameProject.id, { title: name });
    setRenameProject(null);
    setToast("Project renamed successfully.");
  };

  const handleDeleteProject = () => {
    if (!deleteProject) return;
    setProjects((current) => current.filter((project) => project.id !== deleteProject.id));
    moveProjectToTrash(deleteProject.id);
    setDeleteProject(null);
    setToast("Project deleted successfully.");
  };

  const handleAddMember = (member) => {
    if (!addMemberProject) return;
    const nextMember = {
      ...member,
      id: `${member.id}-${Date.now()}`,
      role: member.role || "Collaborator",
    };
    setProjects((current) =>
      current.map((project) =>
        project.id === addMemberProject.id
          ? { ...project, members: [...project.members, nextMember], updatedLabel: "Updated just now" }
          : project,
      ),
    );
    setAddMemberProject(null);
    setToast("Members added successfully.");
  };

  const handleRemoveMember = () => {
    if (!removeMemberTarget) return;
    setProjects((current) =>
      current.map((project) =>
        project.id === removeMemberTarget.project.id
          ? {
              ...project,
              members: project.members.filter((member) => member.id !== removeMemberTarget.member.id),
              updatedLabel: "Updated just now",
            }
          : project,
      ),
    );
    setRemoveMemberTarget(null);
    setToast("Member removed successfully.");
  };

  return (
    <div className="min-h-screen bg-nexus-bg font-sans text-nexus-text">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <div className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]"}`}>
        <DashboardHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 p-4 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-nexus-text sm:text-4xl">Team Management</h1>
              <p className="mt-2 text-sm text-nexus-muted sm:text-base">
                Manage member permissions and project access across your workspace.
              </p>
            </div>
            <div className="relative" ref={sortRef}>
              <button
                aria-expanded={sortOpen}
                className="inline-flex items-center gap-2 rounded-xl border border-nexus-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                onClick={() => setSortOpen((current) => !current)}
                type="button"
              >
                <SortAsc size={17} /> {activeSortLabel} <ChevronDown size={16} />
              </button>
              <SortMenu
                onSelect={(value) => {
                  setSortMode(value);
                  setSortOpen(false);
                }}
                open={sortOpen}
                selectedSort={sortMode}
              />
            </div>
          </div>

          <section className="space-y-4">
            {visibleProjects.map((project) => {
              const isOpen = openProjectIds.includes(project.id);
              return (
                <article className="overflow-hidden rounded-xl border border-nexus-border bg-white shadow-sm transition hover:shadow-md" key={project.id}>
                  <div
                    className="flex cursor-pointer flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    onClick={() => toggleProject(project.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") toggleProject(project.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${project.iconTone}`}>
                        {project.id === "global-expansion" ? <Globe2 size={20} /> : <Folder size={20} />}
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-nexus-text">{project.title}</h2>
                        <p className="text-xs font-medium text-nexus-muted">{project.updatedLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:justify-end">
                      <ProjectAvatarStack members={project.members} />
                      <div className="flex items-center gap-2">
                        <div className="relative" ref={openMenuProjectId === project.id ? menuRef : null}>
                          <button
                            aria-label={`Open project actions for ${project.title}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuProjectId((current) => (current === project.id ? null : project.id));
                            }}
                            type="button"
                          >
                            <MoreVertical size={18} />
                          </button>
                          <ProjectMenu
                            onDelete={(event) => {
                              event.stopPropagation();
                              setOpenMenuProjectId(null);
                              setDeleteProject(project);
                            }}
                            onRename={(event) => {
                              event.stopPropagation();
                              setOpenMenuProjectId(null);
                              setRenameProject(project);
                            }}
                            open={openMenuProjectId === project.id}
                          />
                        </div>
                        <ChevronDown className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} size={20} />
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-nexus-border bg-slate-50/60 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-nexus-muted">
                          Team Members ({project.members.length})
                        </p>
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-nexus-primary transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                          onClick={() => setAddMemberProject(project)}
                          type="button"
                        >
                          <PlusCircle size={15} /> Add Member
                        </button>
                      </div>
                      <div className="space-y-2">
                        {project.members.map((member) => {
                          const isOwner = member.permission === "Owner";
                          return (
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-nexus-border/70 bg-white p-3 transition hover:border-blue-200" key={member.id}>
                              <div className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${member.tone}`}>
                                  {initials(member.name)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-nexus-text">{member.name}</p>
                                  <p className="truncate text-xs text-nexus-muted">{member.role}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-4">
                                {isOwner && (
                                  <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-nexus-primary">
                                    Owner
                                  </span>
                                )}
                                <button
                                  aria-label={`Remove ${member.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                  disabled={isOwner}
                                  onClick={() => setRemoveMemberTarget({ member, project })}
                                  type="button"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </main>
      </div>

      <AddMemberModal onAdd={handleAddMember} onClose={() => setAddMemberProject(null)} project={addMemberProject} />
      <RemoveMemberModal
        member={removeMemberTarget?.member}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleRemoveMember}
        project={removeMemberTarget?.project}
      />
      <RenameProjectModal onClose={() => setRenameProject(null)} onSave={handleRenameProject} project={renameProject} />
      <DeleteProjectModal onClose={() => setDeleteProject(null)} onConfirm={handleDeleteProject} project={deleteProject} />
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default TeamsPage;
