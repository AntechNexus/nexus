import { getProjectDocumentSummary } from "./projectDetailApi";

const PROJECTS_STORAGE_KEY = "nexusPrototypeProjects";

const memberTones = [
  "bg-blue-100 text-nexus-primary",
  "bg-pink-100 text-nexus-ai",
  "bg-indigo-100 text-indigo-700",
  "bg-slate-100 text-slate-700",
];

const readStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
};

const getCurrentOwner = () => {
  const storedProfile = readStoredJson("nexusOnboardingProfile");
  const storedAccount = readStoredJson("nexusPrototypeAccount");
  const name = storedProfile.fullName || storedAccount.fullName || "Alex Carter";

  return {
    id: "current-user",
    name,
    email: storedProfile.email || storedAccount.email || "",
    initials: getInitials(name),
    role: storedProfile.role || "Project Owner",
    permission: "Owner",
    tone: memberTones[0],
  };
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NA";

const normalizeMember = (member, index) => ({
  id: member.id || member.name?.toLowerCase().replace(/\s+/g, "-"),
  name: member.name,
  email: member.email,
  initials: member.initials || getInitials(member.name),
  role: member.role,
  permission: member.permission,
  tone: member.tone || memberTones[index % memberTones.length],
});

const ensureOwnerMember = (members) => {
  const normalizedMembers = members.map(normalizeMember).filter((member) => member.name);
  const owner = getCurrentOwner();
  const hasOwner = normalizedMembers.some((member) => member.permission === "Owner" || member.id === owner.id);

  if (hasOwner) {
    return normalizedMembers.map((member) =>
      member.permission === "Owner" || member.id === owner.id ? { ...owner, ...member, permission: "Owner" } : member,
    );
  }

  return [owner, ...normalizedMembers];
};

const formatUpdatedLabel = (dateValue) => {
  if (!dateValue) return "Updated just now";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Updated just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) return `Updated ${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffHours < 48) return "Updated yesterday";

  return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

/**
 * API service function: normalizeProject
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const normalizeProject = (project) => {
  const documentSummary = getProjectDocumentSummary(project.id);
  const updatedAt = documentSummary.updatedAt || project.updatedAt || project.updated_at || project.createdAt || project.created_at;
  const hasDocumentSummary = documentSummary.fileCount > 0 || Boolean(documentSummary.updatedAt);

  return {
    id: project.id,
    title: project.title,
    description: project.description || "Project workspace ready for documentation and collaboration.",
    fileCount: hasDocumentSummary ? documentSummary.fileCount : project.fileCount ?? project.file_count ?? 0,
    updatedAt,
    updatedLabel: hasDocumentSummary || updatedAt ? formatUpdatedLabel(updatedAt) : project.updatedLabel || project.updated_label || "Updated just now",
    members: ensureOwnerMember(project.members || []),
    status: project.status || "active",
  };
};

/**
 * API service function: getProjects
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const getProjects = () => {
  const storedProjects = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]");
  return storedProjects.map(normalizeProject);
};

/**
 * API service function: saveProject
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const saveProject = (project) => {
  const currentProjects = getProjects();
  const nextProject = normalizeProject({
    ...project,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
  });
  const withoutDuplicate = currentProjects.filter((item) => item.id !== nextProject.id);
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([nextProject, ...withoutDuplicate]));
  return nextProject;
};

/**
 * API service function: updateProject
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const updateProject = (projectId, updates) => {
  const nextProjects = getProjects().map((project) =>
    project.id === projectId ? normalizeProject({ ...project, ...updates, updatedAt: new Date().toISOString() }) : project,
  );
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  return nextProjects;
};

/**
 * API service function: moveProjectToTrash
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const moveProjectToTrash = (projectId) => {
  const nextProjects = getProjects().filter((project) => project.id !== projectId);
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  return nextProjects;
};
