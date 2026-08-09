const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const models = await ai.models.list();
    const embedModels = models.filter(m => m.supportedGenerationMethods.includes('embedContent'));
    console.log(embedModels.map(m => m.name));
  } catch (err) {
    console.log(err.message);
  }
}
run();
