import tokenService from "./token.service";

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
 * Fetches the default or initial prompts used by the Ask Nexus feature.
 * 
 * This function is designed to return a predefined list of prompts that can be presented
 * to the user in the UI. These prompts guide the user on what kind of questions they can
 * ask the AI regarding their project or documents. Currently, this function returns a
 * static, locally defined array of strings, but it is structured as a service call
 * so it can easily be swapped out for a dynamic backend endpoint in the future without
 * affecting the consuming components.
 * 
 * By returning predefined prompts, it reduces friction for the user and showcases the
 * capabilities of the Nexus AI. It does not make any actual HTTP request at this time.
 * 
 * @returns {Array<string>} An array of prompt strings that the user can select.
 */
export const fetchAskNexusPrompts = () => {
  return defaultPrompts;
};

const getAuthHeaders = () => {
  const token = tokenService.getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Ask a new question
/**
 * Initiates a new conversation with the Ask Nexus AI by submitting a prompt or question.
 * 
 * This function constructs an HTTP POST request to the Gemini AI backend endpoint specifically
 * designed for answering user inquiries. It attaches the necessary authentication headers
 * to ensure that only authorized users can interact with the AI. The payload provided
 * typically contains the user's question, the context (such as the current project ID),
 * and any other relevant metadata required by the AI model to generate an accurate response.
 * 
 * The function handles the response asynchronously. If the backend returns an error status
 * (e.g., non-2xx status code), it intercepts the failure, attempts to parse the error message
 * provided by the server, and throws an exception to be handled by the caller. On success,
 * it parses and returns the JSON payload containing the AI's response and the newly created
 * conversation ID for subsequent follow-ups.
 * 
 * @param {Object} payload - The data payload to be sent to the AI backend.
 * @param {string} [payload.prompt] - The question or command from the user.
 * @param {string} [payload.projectId] - The associated project context for the inquiry.
 * @returns {Promise<Object>} A promise resolving to the API response object containing the AI's answer and conversation metadata.
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
 * Retrieves a list of past conversations the user has had with the Ask Nexus AI.
 * 
 * This function performs an HTTP GET request to fetch the user's conversation history.
 * It conditionally appends a `projectId` query parameter to the request URL if one is provided,
 * allowing the backend to filter the conversations to only those relevant to a specific project.
 * If no `projectId` is provided, it retrieves all conversations across all projects for the authenticated user.
 * 
 * The authorization token is included in the headers to verify the user's identity and ensure
 * they only receive their own conversation data. Upon a successful fetch, it parses the JSON
 * response and maps over the array of conversations to inject an `updatedLabel` property.
 * This label formats the `updatedAt` timestamp into a human-readable string (e.g., "Oct 12")
 * for consistent rendering in the UI's sidebar or history panel. Any network or server errors
 * result in an exception being thrown.
 * 
 * @param {string|null} [projectId=null] - An optional project ID used to filter the fetched conversations.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of conversation objects, each augmented with an `updatedLabel`.
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
 * Retrieves the full details and message history of a specific Ask Nexus conversation.
 * 
 * This function makes an HTTP GET request targeting a specific conversation by its unique identifier.
 * It is typically invoked when a user clicks on a past conversation from their history list,
 * necessitating the loading of all associated messages, context, and metadata to render the chat view.
 * 
 * The request relies on standard authentication headers to ensure the user has the requisite
 * permissions to access this specific conversation. If the backend fails to process the request
 * or the conversation cannot be found, the function intercepts the non-ok response and throws
 * a generic error. Otherwise, it extracts the `data` payload from the JSON response and returns
 * the fully populated conversation object to the caller.
 * 
 * @param {string} conversationId - The unique identifier of the conversation to be fetched.
 * @returns {Promise<Object>} A promise resolving to the detailed conversation object, containing the array of messages.
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
 * Appends a new message to an existing Ask Nexus conversation and retrieves the AI's response.
 * 
 * Functionally, this method operates similarly to `askNexus` by making a POST request to the primary
 * asking endpoint. However, the payload provided to this function must include the `conversationId`
 * of an ongoing chat. The backend uses this ID to contextualize the user's new message within the
 * existing flow of the conversation, allowing the AI model to reference previous questions and answers.
 * 
 * After successfully posting the new message and receiving the backend's confirmation, this function
 * takes an additional step: it automatically fetches the updated, full conversation object by calling
 * `fetchAskNexusConversation` with the returned conversation ID. This ensures the frontend receives
 * the completely synchronized state of the chat, including any backend-generated IDs or timestamps
 * for the newly added messages.
 * 
 * @param {Object} payload - The payload containing the new message data and the context.
 * @param {string} payload.conversationId - The ID of the existing conversation to append to.
 * @param {string} payload.prompt - The new question or message from the user.
 * @returns {Promise<Object>} A promise resolving to the fully updated conversation object.
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
 * Requests the AI to regenerate its most recent response in a specific conversation.
 * 
 * This function triggers an HTTP POST request to a dedicated regeneration endpoint on the backend.
 * It is used when a user is dissatisfied with the AI's latest answer and wishes for the model
 * to attempt a different approach or formulation based on the exact same context and previous messages.
 * The payload exclusively contains the `conversationId` to identify which chat needs its tail modified.
 * 
 * In the event of a failure (e.g., rate limiting, server error, or invalid ID), the function
 * gracefully catches the backend error response and throws a structured exception. Upon success,
 * much like `appendAskNexusMessage`, it automatically initiates a follow-up request to fetch the
 * fully updated conversation state, ensuring the UI can seamlessly replace the old message with the new one.
 * 
 * @param {string} conversationId - The unique identifier of the conversation where the last message should be regenerated.
 * @returns {Promise<Object>} A promise resolving to the fully updated conversation object containing the regenerated response.
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
 * Permanently deletes a specific Ask Nexus conversation from the user's history.
 * 
 * This function dispatches an HTTP DELETE request to the conversations endpoint, targeting the
 * resource identified by `conversationId`. This operation is typically triggered by a user action
 * in the UI (e.g., clicking a trash icon next to a history item) to clean up clutter or remove
 * sensitive chats.
 * 
 * The request is strictly authenticated via headers. The function monitors the response status;
 * if the deletion fails for any reason (e.g., insufficient permissions or the conversation doesn't exist),
 * it extracts the error message and throws an exception to alert the application. If successful,
 * it returns the parsed JSON confirmation from the server, allowing the frontend to safely remove
 * the conversation from local state.
 * 
 * @param {string} conversationId - The unique identifier of the conversation slated for deletion.
 * @returns {Promise<Object>} A promise resolving to the API's deletion confirmation response.
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
