/**
 * Mock data array representing a collection of active projects on the dashboard.
 * Used primarily for UI development and testing when the backend API is unavailable.
 * Contains objects with detailed project metadata including IDs, titles, modification strings, 
 * and arrays representing team members with their respective avatar styling.
 * 
 * @type {Array<Object>}
 */
export const initialProjects = [
  {
    id: "global-site-localization",
    title: "Global Site Localization",
    description: "Last updated 2 hours ago by Jordan S.",
    members: [
      { name: "Jordan S.", initials: "JS", tone: "bg-blue-100 text-nexus-primary" },
      { name: "Alex M.", initials: "AM", tone: "bg-pink-100 text-nexus-ai" },
    ],
  },
  {
    id: "patent-translation-phase-iv",
    title: "Patent Translation Phase IV",
    description: "Last updated yesterday by Security Team",
    members: [{ name: "Security Team", initials: "ST", tone: "bg-indigo-100 text-indigo-700" }],
  },
  {
    id: "mobile-app-ui-ux-copy",
    title: "Mobile App UI UX Copy",
    description: "Last updated Oct 12 by Research Lab",
    members: [{ name: "Research Lab", initials: "RL", tone: "bg-slate-100 text-slate-700" }],
  },
];

/**
 * Mock data array representing a list of recently accessed or modified files by the user.
 * It simulates real-world file management data, providing structured properties such as
 * the file ID, name, last editor, time of last edit, file size, associated team members, and the type of file (e.g., document or folder).
 * 
 * @type {Array<Object>}
 */
export const recentFiles = [
  {
    id: "cloud-infrastructure-v2",
    name: "Cloud_Infrastructure_V2.prd",
    editor: "Marcus Chen",
    lastEdit: "15 mins ago",
    size: "12.4 MB",
    team: ["JD", "MK"],
    type: "document",
  },
  {
    id: "product-vision-master",
    name: "Product_Vision_Master",
    editor: "Sarah Miller",
    lastEdit: "Yesterday",
    size: "No file size",
    team: ["SM"],
    type: "folder",
  },
];
