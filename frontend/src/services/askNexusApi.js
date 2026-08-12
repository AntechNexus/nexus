const GEMINI_API = import.meta.env.VITE_GEMINI_API_URL || "http://localhost:5001/api";

// Mocked prompts for the UI
const defaultPrompts = [
  "Summarize key decisions",
  "Identify conflicting requirements",
  "List main stakeholders",
  "Find missing acceptance criteria",
  "What risks should we clarify before development?",
];

/**
 * API service function: fetchAskNexusPrompts
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchAskNexusPrompts = () => {
  return defaultPrompts;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("nexus_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Ask a new question
/**
 * API service function: askNexus
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const askNexus = async (payload) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/ask`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to ask Nexus");
  }
  return res.json();
};

/**
 * API service function: fetchAskNexusConversations
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchAskNexusConversations = async (projectId = null) => {
  const url = projectId ? `${GEMINI_API}/ask-nexus/conversations?projectId=${projectId}` : `${GEMINI_API}/ask-nexus/conversations`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }
  const result = await res.json();
  return result.data.map(conv => ({
    ...conv,
    // Add updatedLabel for UI consistency
    updatedLabel: new Date(conv.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }));
};

/**
 * API service function: fetchAskNexusConversation
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const fetchAskNexusConversation = async (conversationId) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/conversations/${conversationId}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error("Failed to fetch conversation");
  }
  const result = await res.json();
  return result.data;
};

/**
 * API service function: appendAskNexusMessage
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const appendAskNexusMessage = async (payload) => {
  // We can just call askNexus again with conversationId attached
  const res = await fetch(`${GEMINI_API}/ask-nexus/ask`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to append message");
  }
  const result = await res.json();
  
  return fetchAskNexusConversation(result.conversationId);
};

/**
 * API service function: regenerateAskNexusMessage
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {...any} args - Arguments required for the API call (e.g., payloads, IDs).
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const regenerateAskNexusMessage = async (conversationId) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/regenerate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to regenerate message");
  }
  const result = await res.json();
  
  return fetchAskNexusConversation(result.conversationId);
};

/**
 * API service function: deleteAskNexusConversation
 * Coordinates HTTP requests to the backend for this feature.
 * 
 * @param {string} conversationId - The ID of the conversation to delete.
 * @returns {Promise<any>} A promise resolving to the API response data.
 */
export const deleteAskNexusConversation = async (conversationId) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/conversations/${conversationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete conversation");
  }
  return res.json();
};
