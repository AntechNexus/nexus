import { getProjectDocumentSummary } from "./projectDetailApi";

const PROJECTS_STORAGE_KEY = "nexusPrototypeProjects";

const memberTones = [
  "bg-blue-100 text-nexus-primary",
  "bg-pink-100 text-nexus-ai",
  "bg-indigo-100 text-indigo-700",
  "bg-slate-100 text-slate-700",
];

/**
 * Safely reads and parses a JSON string from localStorage.
 *
 * This helper function encapsulates the logic for retrieving data from the browser's
 * localStorage API and converting it back into a JavaScript object. It mitigates the
 * risk of application crashes caused by `JSON.parse` exceptions. If the specified `key`
 * does not exist, or if the data is malformed and throws a SyntaxError during parsing,
 * it safely catches the error and returns a default empty object `{}`.
 *
 * @param {string} key - The localStorage key to look up.
 * @returns {Object} The parsed JSON data or an empty object on failure.
 */
const readStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
};

/**
 * Constructs the current owner profile based on stored user data.
 *
 * This function retrieves user profile information from local storage (checking both
 * `nexusOnboardingProfile` and `nexusPrototypeAccount`). It extracts the full name
 * and email, falling back to mock data ("Alex Carter") if neither is found. It then
 * formats this data into a standardized member object, ensuring the user has the
 * "Owner" permission and a predefined aesthetic tone. This is primarily used to
 * guarantee that the current user is always represented correctly in project member lists.
 *
 * @returns {Object} A structured object representing the current user as an owner.
 */
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

/**
 * Generates capitalized initials from a given full name string.
 *
 * This utility processes a string containing a person's name, splits it into individual
 * words (ignoring empty spaces), and takes the first letter of up to the first two words.
 * These letters are concatenated and converted to uppercase. If the input name is empty
 * or invalid, it returns a fallback string "NA". This is useful for rendering avatar
 * placeholders in the UI when profile pictures are unavailable.
 *
 * @param {string} [name=""] - The full name string to extract initials from.
 * @returns {string} Up to two uppercase letters representing the name's initials.
 */
const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NA";

/**
 * Standardizes a project member object to ensure consistency across the UI.
 *
 * This function takes a raw `member` object and ensures all required fields are present
 * and correctly formatted. It generates a slug-like ID if one is missing, computes
 * initials using `getInitials`, and assigns a default aesthetic `tone` based on the
 * member's index in the array if they don't already have one. This helps prevent rendering
 * errors in components that expect a strict schema for team members.
 *
 * @param {Object} member - The raw member data object.
 * @param {number} index - The index of the member in the array, used for assigning tones.
 * @returns {Object} The normalized and complete member object.
 */
const normalizeMember = (member, index) => ({
  id: member.id || member.name?.toLowerCase().replace(/\s+/g, "-"),
  name: member.name,
  email: member.email,
  initials: member.initials || getInitials(member.name),
  role: member.role,
  permission: member.permission,
  tone: member.tone || memberTones[index % memberTones.length],
});

/**
 * Validates and ensures the current user is included as an owner in the members list.
 *
 * When loading or creating a project, this function processes the raw array of members.
 * First, it normalizes every member in the list, filtering out any invalid entries that
 * lack a name. Then, it checks if an "Owner" already exists in the list or if the current
 * user's ID is present. If the owner is found, it merges their existing data with the
 * `getCurrentOwner` schema to guarantee they have full owner permissions. If the owner
 * is entirely absent from the list, they are prepended to the array. This enforces data
 * integrity regarding project ownership.
 *
 * @param {Array<Object>} members - The raw array of project members.
 * @returns {Array<Object>} The processed array of members, guaranteed to include the owner.
 */
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

/**
 * Computes a human-readable "time ago" label based on a timestamp.
 *
 * This function takes a date value (string or timestamp) and compares it against the
 * current system time. It formats the difference into a user-friendly string such as
 * "Updated just now", "Updated 5 mins ago", or "Updated yesterday". For dates older
 * than 48 hours, it falls back to a short date string (e.g., "Updated Oct 12"). If the
 * input is invalid or missing, it defaults to "Updated just now". This provides a more
 * natural user experience than displaying raw UTC timestamps.
 *
 * @param {string|number|Date} dateValue - The timestamp to format.
 * @returns {string} A relative time string describing when the update occurred.
 */
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
 * Normalizes a raw project object into a standardized, UI-ready format.
 *
 * This core transformation function takes a raw project entity (either from local storage
 * or an API) and ensures all its fields conform to the application's schema. It retrieves
 * supplementary document summaries via `getProjectDocumentSummary` to calculate accurate
 * file counts and the latest `updatedAt` timestamps. It handles differences in naming
 * conventions (like `updated_at` vs `updatedAt`) and applies `formatUpdatedLabel` and
 * `ensureOwnerMember`. This acts as a data layer sanitization step.
 *
 * @param {Object} project - The raw project data from the data source.
 * @returns {Object} The sanitized, consistently formatted project object.
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
 * Retrieves and normalizes the entire list of projects from local storage.
 *
 * This function acts as the primary data fetcher for the projects dashboard. It reads
 * the raw array of projects stored under `PROJECTS_STORAGE_KEY`. It then maps over this
 * array, passing each item through the `normalizeProject` function to ensure consistency,
 * updated file counts, and correct ownership before returning the list to the UI
 * components for rendering.
 *
 * @returns {Array<Object>} An array of normalized project objects.
 */
export const getProjects = () => {
  const storedProjects = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]");
  return storedProjects.map(normalizeProject);
};

/**
 * Persists a new or updated project to the local storage database.
 *
 * This function takes a project object, applies timestamps if they are missing, and
 * passes it through `normalizeProject` for standardization. It retrieves the current
 * list of projects, filters out any existing project with the same ID (to handle updates
 * vs creates seamlessly), and prepends the new project to the array. The updated array
 * is then serialized and saved back to local storage. It returns the normalized project.
 *
 * @param {Object} project - The project data to be saved.
 * @returns {Object} The normalized and saved project object.
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
 * Updates specific properties of an existing project.
 *
 * Instead of requiring the entire project object, this function takes a `projectId` and
 * a set of partial `updates`. It fetches the current list of projects and iterates through
 * them. When it finds the matching project, it merges the `updates`, assigns a new
 * `updatedAt` timestamp, normalizes the result, and saves the entire list back to local
 * storage. This is ideal for minor edits like changing a title or description.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {Object} updates - A partial object containing the fields to update.
 * @returns {Array<Object>} The updated, complete array of all projects.
 */
export const updateProject = (projectId, updates) => {
  const nextProjects = getProjects().map((project) =>
    project.id === projectId ? normalizeProject({ ...project, ...updates, updatedAt: new Date().toISOString() }) : project,
  );
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  return nextProjects;
};

/**
 * Removes a project from the active workspace view (simulating moving to trash).
 *
 * This function permanently deletes a project from the `localStorage` list. It reads the
 * current projects, filters out the project that matches the given `projectId`, and writes
 * the remaining projects back to storage. While named "moveProjectToTrash", in this
 * specific local implementation, it acts as a hard delete. It returns the new array of
 * remaining projects so the UI can update immediately.
 *
 * @param {string} projectId - The ID of the project to remove.
 * @returns {Array<Object>} The updated array of projects excluding the removed one.
 */
export const moveProjectToTrash = (projectId) => {
  const nextProjects = getProjects().filter((project) => project.id !== projectId);
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  return nextProjects;
};
