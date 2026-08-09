const GEMINI_API = import.meta.env.VITE_GEMINI_API_URL || "http://localhost:5001/api";

// Mocked prompts for the UI
const defaultPrompts = [
  "Summarize key decisions",
  "Identify conflicting requirements",
  "List main stakeholders",
  "Find missing acceptance criteria",
  "What risks should we clarify before development?",
];

export const fetchAskNexusPrompts = () => {
  return defaultPrompts;
};

// Ask a new question
export const askNexus = async (payload) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // Assuming token is handled or omitted for now
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to ask Nexus");
  }
  return res.json();
};

export const fetchAskNexusConversations = async (projectId = null) => {
  const url = projectId ? `${GEMINI_API}/ask-nexus/conversations?projectId=${projectId}` : `${GEMINI_API}/ask-nexus/conversations`;
  const res = await fetch(url);
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

export const fetchAskNexusConversation = async (conversationId) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/conversations/${conversationId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch conversation");
  }
  const result = await res.json();
  return result.data;
};

export const appendAskNexusMessage = async (payload) => {
  // We can just call askNexus again with conversationId attached
  const res = await fetch(`${GEMINI_API}/ask-nexus/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to append message");
  }
  const result = await res.json();
  
  return fetchAskNexusConversation(result.conversationId);
};

export const regenerateAskNexusMessage = async (conversationId) => {
  const res = await fetch(`${GEMINI_API}/ask-nexus/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to regenerate message");
  }
  const result = await res.json();
  
  return fetchAskNexusConversation(result.conversationId);
};
