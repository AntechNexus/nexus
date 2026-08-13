const { pipeline } = require('@xenova/transformers');
const DocumentEmbedding = require("../models/DocumentEmbedding");

let extractor = null;
/**
 * Initializes and retrieves the Xenova/bge-base-en-v1.5 embedding extractor model.
 * 
 * This function utilizes a singleton pattern to ensure the 768-dimensional feature-extraction 
 * pipeline is instantiated exactly once. The loaded model is quantized to improve performance 
 * and reduce memory footprint while processing document text.
 * 
 * @returns {Promise<Function>} A promise that resolves to the initialized feature-extraction pipeline function.
 * @sideEffects Mutates the global `extractor` variable upon initial execution, loading the AI model into memory.
 */
async function getExtractor() {
  if (!extractor) {
    // bge-base-en-v1.5 outputs 768 dimensions, perfectly matching the database schema
    extractor = await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5', { quantized: true });
  }
  return extractor;
}

/**
 * Splits a long body of text into an array of smaller, manageable chunks.
 * 
 * This utility function segments large documents into smaller blocks defined by the `maxChars` limit. 
 * It ensures that words are not split in half by breaking the text exclusively at space characters. 
 * This is vital for maintaining semantic meaning during vector embedding.
 * 
 * @param {string} text - The full, unsegmented document text to be chunked.
 * @param {number} [maxChars=1000] - The maximum number of characters allowed per chunk.
 * @returns {string[]} An array containing the sequentially chunked text blocks.
 * @sideEffects None. This is a pure data transformation function.
 */
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

/**
 * Generates and stores vector embeddings for uploaded document text.
 * 
 * This controller function takes a raw text payload, chunks it into smaller blocks, and utilizes 
 * a local Transformers.js model to generate 768-dimensional vector embeddings. To prevent duplication 
 * during re-processing, it first purges any existing embeddings for the provided file ID before saving 
 * the newly generated vectors to the database.
 * 
 * @param {Object} req - Express request object. Expects `text`, `projectId`, `fileId`, `createdBy`, and optional metadata in the body.
 * @param {Object} res - Express response object used to send the success status and the total count of processed embeddings.
 * @returns {Promise<Object>} A promise resolving to the Express response confirming the successful embedding generation.
 * @sideEffects Deletes existing documents matching `fileId` in the `DocumentEmbedding` collection. Inserts multiple new documents into the `DocumentEmbedding` collection.
 */
const generateEmbeddings = async (req, res) => {
  try {
    const { text, projectId, fileId, createdBy, pageNumber, audioTimestamp } = req.body;
    
    if (!text || !projectId || !fileId || !createdBy) {
      return res.status(400).json({ message: "Missing required fields for embedding" });
    }

    const extract = await getExtractor();
    const chunks = chunkText(text, 1000); // 1000 chars per chunk

    let savedCount = 0;

    // Delete existing embeddings for this file to avoid duplicates on re-extraction
    await DocumentEmbedding.deleteMany({ fileId });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      // Extract local embedding
      const output = await extract(chunk, { pooling: 'mean', normalize: true });
      const embeddingValues = Array.from(output.data);

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
