const { OpenAI } = require("openai");
const File = require("../models/File");

/**
 * Handles generating a short AI summary for a specific file.
 *
 * Purpose: Takes a file ID from the request, retrieves its contents (either from the File or Transcript model), and sends the text to the Gemini AI model to generate a concise bulleted summary. The result is then cleaned up and returned to the client.
 *
 * @param {Object} req - Express request object containing the file ID in `req.params`.
 * @param {Object} res - Express response object used to send back the HTTP response.
 * @returns {Object} JSON response containing the success status and summary text, or an error message with appropriate HTTP status.
 *
 * Side Effects:
 * - Queries the database for the File and optionally the Transcript model.
 * - Makes a network request to an external AI API (Gemini).
 * - Logs errors to the standard console if an exception occurs.
 */
const handleSummary = async (req, res) => {
  try {
    const { id } = req.params;

    // For MVP Microservice, we bypass project member checks here
    // unless we also copy Project and User schemas and authenticate.
    const file = await File.findOne({ _id: id, status: { $ne: "deleted" } });
    if (!file) {
      return res.status(404).json({ detail: "File not found" });
    }

    let documentText = file.content;

    if (!documentText) {
      // Fallback to checking Transcript model
      const Transcript = require("../models/Transcript");
      const transcript = await Transcript.findOne({ fileId: id });
      if (transcript && transcript.fullText) {
        documentText = transcript.fullText;
      }
    }

    if (!documentText) {
      return res
        .status(400)
        .json({
          detail: "The document is empty or text could not be extracted.",
        });
    }

    // Prompt Gemini to summarize
    const prompt = `Summarize the following document into exactly very short bullet points. Keep each point under 15 words, highlighting only the absolute core message and final conclusion. Write the summary in English.
IMPORTANT: Do NOT wrap your response in markdown code blocks (e.g., \`\`\`md or \`\`\`markdown). Output raw text only.

Document Text:
${documentText.substring(0, 100000)}`;

    const client = new OpenAI({
      baseURL: process.env.ELICE_URL_3_6_FLASH,
      apiKey: process.env.ELICE_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gemini-3.6-flash",
      messages: [{ role: "user", content: prompt }],
    });

    let summaryText = response.choices[0].message.content.trim();
    // Programmatic fallback to strip markdown blocks if model ignored instruction
    summaryText = summaryText
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    // Match the JSON structure expected by frontend (which was looking for res.success && res.summary)
    return res.json({ success: true, summary: summaryText });
  } catch (error) {
    console.error("Summary error:", error);
    return res
      .status(500)
      .json({ detail: error.message || "Internal server error" });
  }
};

module.exports = { handleSummary };
