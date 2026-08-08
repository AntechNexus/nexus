const { GoogleGenAI } = require("@google/genai");
const File = require("../models/File");
const Transcript = require("../models/Transcript");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const handleTranscribe = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if transcript is already cached in DB
    const existingTranscript = await Transcript.findOne({ fileId: id });
    if (existingTranscript) {
      return res.json({ transcript: existingTranscript });
    }

    const file = await File.findOne({ _id: id, status: { $ne: "deleted" } });
    if (!file) {
      return res.status(404).json({ detail: "File not found" });
    }

    if (!file.localPath) {
      return res.status(400).json({ detail: "File localPath is missing. Cannot transcribe." });
    }

    let uploadedFile;
    try {
      // Find mimeType based on extension
      let mimeType = "audio/mp3";
      if (file.fileName.endsWith(".wav")) mimeType = "audio/wav";
      else if (file.fileName.endsWith(".m4a")) mimeType = "audio/m4a";
      else if (file.fileName.endsWith(".ogg")) mimeType = "audio/ogg";
      else if (file.fileName.endsWith(".flac")) mimeType = "audio/flac";

      uploadedFile = await ai.files.upload({
         file: file.localPath,
         mimeType: mimeType,
      });

      let currentGf = uploadedFile;
      let retries = 0;
      while (currentGf.state === "PROCESSING" && retries < 15) {
        await new Promise(r => setTimeout(r, 2000));
        currentGf = await ai.files.get({ name: uploadedFile.name });
        retries++;
      }
      
      if (currentGf.state === "FAILED") {
        return res.status(500).json({ detail: "Gemini failed to process the audio file." });
      }

      const prompt = `
Please transcribe this audio recording.
Respond ONLY with a raw, valid JSON object. Do not include markdown code blocks like \`\`\`json.
The JSON object must have this EXACT structure:
{
  "fullText": "The complete transcript text in one paragraph or string...",
  "durationSeconds": 120,
  "language": "Indonesian",
  "segments": [
    { "start": 0, "end": 5, "text": "[Speaker 1]: Hello, good morning." },
    { "start": 5, "end": 12, "text": "[Speaker 2]: Morning, let's start." }
  ]
}

Note on 'segments':
- 'start' and 'end' must be integers representing seconds.
- Include the speaker's name in the text if possible (e.g. "[Speaker Name]: ...").
`;
      
      const contents = [{ 
         role: "user", 
         parts: [
           { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
           { text: prompt }
         ] 
      }];

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
      });

      // Cleanup
      await ai.files.delete({ name: uploadedFile.name });

      let responseText = response.text.trim();
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      }

      const parsedData = JSON.parse(responseText);

      // Save to database using the Transcript model
      const newTranscript = new Transcript({
        fileId: file._id,
        projectId: file.projectId,
        fullText: parsedData.fullText || "No full text provided.",
        language: parsedData.language || "Unknown",
        durationSeconds: parsedData.durationSeconds || 0,
        segments: parsedData.segments || [],
        createdBy: file.createdBy,
      });

      await newTranscript.save();

      return res.json({ transcript: newTranscript });

    } catch (apiError) {
      if (uploadedFile) {
        await ai.files.delete({ name: uploadedFile.name }).catch(() => {});
      }
      throw apiError;
    }

  } catch (error) {
    console.error("Transcribe error:", error);
    return res.status(500).json({ detail: error.message || "Internal server error" });
  }
};

const updateTranscript = async (req, res) => {
  return res.status(405).json({ detail: "Use backend-nexus for updating transcripts." });
};

module.exports = { handleTranscribe, updateTranscript };
