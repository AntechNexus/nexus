const { GoogleGenAI } = require("@google/genai");
const File = require("../models/File");
const Transcript = require("../models/Transcript");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const handleTranscribe = async (req, res) => {
  try {
    const { id } = req.params;

    // Return cached transcript if exists
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

    // Determine mimeType based on file extension
    let mimeType = "audio/mp3";
    const fileName = file.fileName || "";
    if (fileName.endsWith(".wav")) mimeType = "audio/wav";
    else if (fileName.endsWith(".m4a")) mimeType = "audio/m4a";
    else if (fileName.endsWith(".ogg")) mimeType = "audio/ogg";
    else if (fileName.endsWith(".flac")) mimeType = "audio/flac";
    else if (fileName.endsWith(".mp3")) mimeType = "audio/mp3";

    let uploadedFile;
    try {
      console.log(`[Transcribe] Uploading audio to Google Files API...`);
      uploadedFile = await ai.files.upload({
        file: file.localPath,
        mimeType: mimeType,
      });

      // Wait for Google to finish processing the file
      let currentGf = uploadedFile;
      let retries = 0;
      while (currentGf.state === "PROCESSING" && retries < 20) {
        await new Promise((r) => setTimeout(r, 2000));
        currentGf = await ai.files.get({ name: uploadedFile.name });
        retries++;
      }

      if (currentGf.state === "FAILED") {
        return res.status(500).json({ detail: "Google failed to process the audio file." });
      }

      console.log(`[Transcribe] Audio processed, calling Gemini 3.5 Flash...`);

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
- If you cannot identify speakers, use "[Speaker 1]", "[Speaker 2]", etc.
`;

      const contents = [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: currentGf.uri, mimeType: currentGf.mimeType } },
            { text: prompt },
          ],
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
      });

      // Cleanup uploaded file from Google
      await ai.files.delete({ name: uploadedFile.name }).catch(() => {});

      let responseText = response.text.trim();
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```\n?/, "").replace(/\n?```$/, "").trim();
      }

      console.log(`[Transcribe] Response received, parsing...`);
      const parsedData = JSON.parse(responseText);

      let segments = parsedData.segments || [];
      if (!Array.isArray(segments) || segments.length === 0) {
        segments = [
          {
            start: 0,
            end: parsedData.durationSeconds || 0,
            text: parsedData.fullText || "No speech detected.",
          },
        ];
      }

      const newTranscript = new Transcript({
        fileId: file._id,
        projectId: file.projectId,
        fullText: parsedData.fullText || "No full text provided.",
        language: parsedData.language || "Unknown",
        durationSeconds: parsedData.durationSeconds || 0,
        segments,
        createdBy: file.createdBy,
      });

      await newTranscript.save();
      console.log(`[Transcribe] Transcript saved successfully.`);
      return res.json({ transcript: newTranscript });

    } catch (apiError) {
      // Cleanup uploaded file if error occurs
      if (uploadedFile) {
        await ai.files.delete({ name: uploadedFile.name }).catch(() => {});
      }
      throw apiError;
    }

  } catch (error) {
    console.error("Transcribe error:", error.message || error);
    return res.status(500).json({ detail: error.message || "Internal server error" });
  }
};

const updateTranscript = async (req, res) => {
  return res.status(405).json({ detail: "Use backend-nexus for updating transcripts." });
};

module.exports = { handleTranscribe, updateTranscript };
