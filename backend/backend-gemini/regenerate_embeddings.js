const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');
const File = require('./models/File');
const DocumentEmbedding = require('./models/DocumentEmbedding');
require('dotenv').config();

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

async function run() {
  await mongoose.connect('mongodb://localhost:27017/nexus');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const files = await File.find({ content: { $exists: true, $ne: null } });
  console.log(`Found ${files.length} files with content to embed.`);
  
  for (const file of files) {
    try {
      console.log(`Processing file: ${file.originalName || file.fileName}`);
      const chunks = chunkText(file.content, 1000);
      
      await DocumentEmbedding.deleteMany({ fileId: file._id });
      
      let savedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        const embedRes = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: chunk,
        });

        const embeddingValues = embedRes.embeddings[0].values;
        console.log("Got dimension size:", embeddingValues.length);

        const docEmbed = new DocumentEmbedding({
          projectId: file.projectId,
          fileId: file._id,
          chunkIndex: i,
          textContent: chunk,
          embedding: embeddingValues,
          createdBy: file.createdBy,
        });
        await docEmbed.save();
        savedCount++;
      }
      console.log(`Saved ${savedCount} embeddings for file ${file._id}`);
    } catch (err) {
      console.error(`Error processing file ${file._id}:`, err.message);
    }
  }
  
  console.log("Done.");
  process.exit(0);
}

run();
