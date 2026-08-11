import { uploadProjectDocument } from "./projectDetailApi";

const PRD_CLARIFICATIONS_STORAGE_KEY = "nexusPrototypePrdClarifications";
const PRD_WORKSPACE_SESSION_KEY = "nexusPrototypePrdWorkspaceSession";

const readStoredJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
};

/**
 * API service function: savePrdWorkspaceSession
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
 * API service function: fetchPrdWorkspaceSession
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
 * API service function: fetchClarifyingQuestions
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
 * API service function: fetchClarificationSession
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchClarificationSession = () => ({
  id: "prototype-clarification-session",
  status: "needs_answers",
  ...fetchPrdWorkspaceSession(),
  message: "AI synthesizing uploaded context. Please confirm details below.",
  questions: fetchClarifyingQuestions(),
});

/**
 * API service function: saveClarificationAnswers
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
 * API service function: fetchGeneratedPrdDraft
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
 * API service function: saveGeneratedPrdToFiles
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
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
 * API service function: regeneratePrdDraft
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const regeneratePrdDraft = (instruction) => ({
  ok: true,
  instruction,
  version: "V1.1 Draft",
  message: "PRD regenerated successfully.",
});
