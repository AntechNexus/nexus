import { uploadProjectDocument } from "./projectDetailApi";

const PRD_CLARIFICATIONS_STORAGE_KEY = "nexusPrototypePrdClarifications";
const PRD_WORKSPACE_SESSION_KEY = "nexusPrototypePrdWorkspaceSession";

/**
 * Reads and parses a JSON string from the browser's localStorage.
 *
 * This utility function abstracts the boilerplate required to safely retrieve and parse
 * JSON data from `localStorage`. It attempts to fetch the item identified by the given `key`.
 * If the item is missing or evaluates to a falsy value, it defaults to a stringified empty
 * object `"{}"`. It then tries to parse the string into a JavaScript object. If the parsing
 * fails (for example, if the data in localStorage was corrupted or non-JSON), it catches
 * the exception and returns an empty object `{}` to prevent application crashes.
 *
 * @param {string} key - The key of the item to retrieve from localStorage.
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
 * Saves or updates the current PRD workspace session in local storage.
 *
 * This function persists the state of a PRD workspace session, which might include details
 * like the `projectId`, `projectName`, and associated `files` that the user is working with.
 * It reads the existing session from local storage using `readStoredJson`, merges the new
 * `session` properties over the existing ones, and updates the `updatedAt` timestamp to the
 * current date and time. Finally, it stringifies the merged object and stores it back into
 * `localStorage` under the `PRD_WORKSPACE_SESSION_KEY`. It returns the merged object so that
 * the caller can immediately use the updated state in the UI.
 *
 * @param {Object} session - Partial session data to update (e.g., selected files).
 * @returns {Object} The completely merged and updated session object.
 */
export const savePrdWorkspaceSession = (session) => {
  const nextSession = {
    ...readStoredJson(PRD_WORKSPACE_SESSION_KEY),
    ...session,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PRD_WORKSPACE_SESSION_KEY, JSON.stringify(nextSession));
  return nextSession;
};

/**
 * Retrieves the currently saved PRD workspace session from local storage.
 *
 * This function is typically called when a user navigates to the PRD workspace to restore
 * their previous context (such as the project they selected or the files they uploaded).
 * It delegates to `readStoredJson` to extract the data. If specific fields are missing
 * (such as if this is the very first time the user visits the workspace), it provides
 * default fallback values (e.g., a default `projectId` of "global-site-localization").
 * This ensures the application always has a valid session object to work with.
 *
 * @returns {Object} An object containing the `projectId`, `projectName`, `files`, and `updatedAt`.
 */
export const fetchPrdWorkspaceSession = () => {
  const session = readStoredJson(PRD_WORKSPACE_SESSION_KEY);
  return {
    projectId: session.projectId || "global-site-localization",
    projectName: session.projectName || "Customer Onboarding",
    files: session.files || [],
    updatedAt: session.updatedAt || null,
  };
};

/**
 * Provides a mock set of clarifying questions for the PRD generation workflow.
 *
 * In a fully integrated environment, this function might fetch dynamic questions generated
 * by an AI based on the user's uploaded context. For the current prototype or offline mode,
 * this returns a static array of predefined questions, such as identifying primary user
 * personas, payment gateway integrations, and timeline requirements. Each question object
 * specifies its type (e.g., `multi-select`, `radio-with-text`), which the UI uses to render
 * the appropriate form controls.
 *
 * @returns {Array<Object>} An array of question objects defining the clarification form schema.
 */
export const fetchClarifyingQuestions = () => [
  {
    id: "personas",
    type: "multi-select",
    title: "Based on your uploaded SOP, who are the primary user personas?",
    description: "Select all that apply based on system access needs.",
    options: ["End Customer", "System Admin", "Finance Team"],
    allowCustom: true,
  },
  {
    id: "payment-gateway",
    type: "radio-with-text",
    title: "Should this system integrate with third-party payment gateways?",
    options: ["Yes", "No"],
    followUpLabel: "If yes, specify which ones (e.g., Stripe, PayPal):",
    followUpPlaceholder: "e.g. Stripe",
  },
  {
    id: "timeline",
    type: "select",
    title: "What is the targeted release timeline or MVP milestone?",
    placeholder: "Select a timeline...",
    options: ["Q3 2024 - Beta", "Q4 2024 - Full Launch", "2025 Roadmap", "Immediate Internal Use"],
  },
];

/**
 * Initializes and retrieves a mock clarification session object.
 *
 * This function constructs the data structure needed for the Clarification UI view. It
 * merges the current PRD workspace session (using `fetchPrdWorkspaceSession`) with the
 * static questions (using `fetchClarifyingQuestions`). It also assigns a default status
 * of `"needs_answers"` and a conversational message from the AI. This mocks the experience
 * of the AI having finished processing initial documents and now waiting for the user to
 * answer specific inquiries before generating the PRD.
 *
 * @returns {Object} A comprehensive session object including project context and pending questions.
 */
export const fetchClarificationSession = () => ({
  id: "prototype-clarification-session",
  status: "needs_answers",
  ...fetchPrdWorkspaceSession(),
  message: "AI synthesizing uploaded context. Please confirm details below.",
  questions: fetchClarifyingQuestions(),
});

/**
 * Saves the user's answers to the clarifying questions into local storage.
 *
 * After the user fills out the clarification form, this function is invoked to persist
 * their responses. It takes an `answers` object (mapping question IDs to user input),
 * wraps it in a payload containing an `updatedAt` timestamp, and stores it under
 * `PRD_CLARIFICATIONS_STORAGE_KEY`. It then returns a success response with routing
 * information, instructing the caller to navigate to the review route where the generated
 * PRD will be displayed.
 *
 * @param {Object} answers - A dictionary mapping question IDs to their corresponding answers.
 * @returns {Object} A response object indicating success (`ok: true`) and the `nextRoute`.
 */
export const saveClarificationAnswers = (answers) => {
  localStorage.setItem(
    PRD_CLARIFICATIONS_STORAGE_KEY,
    JSON.stringify({
      answers,
      updatedAt: new Date().toISOString(),
    }),
  );

  return {
    ok: true,
    nextRoute: "/ai-prd-workspace/review",
  };
};

/**
 * Fetches a mock generated PRD draft to display in the review interface.
 *
 * This function simulates fetching a fully synthesized Product Requirements Document
 * from the backend. It uses the current workspace session to populate contextual fields
 * like the project ID and name. It returns a structured object containing the document's
 * metadata (title, subtitle, version), an outline array for navigation, and AI-generated
 * insights based on the analysis. In production, this would make an HTTP request and
 * parse the AI's markdown output.
 *
 * @returns {Object} The draft PRD data structure including outline, insight, and metadata.
 */
export const fetchGeneratedPrdDraft = () => {
  const session = fetchPrdWorkspaceSession();

  return {
    id: "customer-onboarding-prd",
    title: "Product Requirements Document",
    subtitle: `${session.projectName} Requirements`,
    projectId: session.projectId,
    projectName: session.projectName,
    version: "V1.0 Draft",
    status: "Nexus AI has generated your PRD. Please review the draft below.",
    outline: [
      { id: "summary", label: "Executive Summary" },
      { id: "user-stories", label: "User Stories" },
      { id: "functional", label: "Functional Requirements" },
      { id: "auth-flow", label: "Authentication Flow" },
      { id: "data-validation", label: "Data Validation" },
      { id: "technical", label: "Technical Assumptions" },
    ],
    insight:
      "I've flagged 2 potential security gaps in the legacy auth architecture diagram that could lead to session hijacking.",
  };
};

/**
 * Persists the generated PRD draft into the project's file system as a document.
 *
 * Once a PRD draft is finalized or accepted, this function is called to formally save it
 * as a file inside the user's workspace. It constructs a mock document object with an auto-generated
 * ID and timestamp, classifying it with `type: "prd"`. It then calls the `uploadProjectDocument`
 * function (imported from `projectDetailApi`) to push this new file to the backend storage.
 * It returns the newly created document details and its parent `projectId`.
 *
 * @param {string} [projectId="global-site-localization"] - The ID of the project to save the file under.
 * @returns {Object} An object containing the created `document` metadata and the `projectId`.
 */
export const saveGeneratedPrdToFiles = (projectId = "global-site-localization") => {
  const document = {
    id: `generated-prd-${Date.now()}`,
    name: "Customer_Onboarding_PRD.prd",
    type: "prd",
    typeLabel: "PRD",
    size: "128 KB",
    parentId: null,
  };

  uploadProjectDocument(projectId, document);

  return {
    document,
    projectId,
  };
};

/**
 * Mocks the regeneration of a PRD draft based on new user instructions.
 *
 * When a user provides feedback on a PRD draft (e.g., "Add more details on security"),
 * this function simulates the process of asking the AI to regenerate the document.
 * In a real application, this would send an HTTP request with the `instruction` string
 * to the backend AI. Here, it simply returns a mock success response acknowledging the
 * instruction and incrementing the version string to indicate a new draft is ready.
 *
 * @param {string} instruction - The natural language instruction from the user for modifications.
 * @returns {Object} A response object containing success status, the new version, and a message.
 */
export const regeneratePrdDraft = (instruction) => ({
  ok: true,
  instruction,
  version: "V1.1 Draft",
  message: "PRD regenerated successfully.",
});
