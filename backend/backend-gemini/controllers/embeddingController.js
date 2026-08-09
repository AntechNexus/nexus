const { GoogleGenAI } = require("@google/genai");
const DocumentEmbedding = require("../models/DocumentEmbedding");

// Function to chunk text into smaller pieces
function chunkText(text, maxChars = 1000) {
  if (!text) return [];
  const words = text.split(" ");
  let chunks = [];
  let currentChunk = "";

  for (let word of words) {
    if ((currentChunk + word).length > maxChars) {
      chunks.push(currentChunk.trim());
      currentChunk = word + " ";
    } else {
      currentChunk += word + " ";
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

const generateEmbeddings = async (req, res) => {
  try {
    const { text, projectId, fileId, createdBy, pageNumber, audioTimestamp } = req.body;
    
    if (!text || !projectId || !fileId || !createdBy) {
      return res.status(400).json({ message: "Missing required fields for embedding" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chunks = chunkText(text, 1000); // 1000 chars per chunk is approx 200-250 tokens

    let savedCount = 0;

    // Delete existing embeddings for this file to avoid duplicates on re-extraction
    await DocumentEmbedding.deleteMany({ fileId });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      const embedRes = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: chunk,
      });

      const embeddingValues = embedRes.embeddings[0].values;

      const docEmbed = new DocumentEmbedding({
        projectId,
        fileId,
        chunkIndex: i,
        textContent: chunk,
        embedding: embeddingValues,
        metadata: {
          pageNumber: pageNumber || null,
          audioTimestamp: audioTimestamp || null,
        },
        createdBy,
      });
      await docEmbed.save();
      savedCount++;
    }

    return res.status(200).json({ success: true, message: `Successfully generated ${savedCount} embeddings.` });

  } catch (error) {
    console.error("Generate Embedding error:", error);
    return res.status(500).json({ message: "Failed to generate embeddings", error: error.message });
  }
};

module.exports = { generateEmbeddings };
