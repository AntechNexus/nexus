const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
/**
 * Fetches the available models from the Google GenAI API,
 * filters them to find those supporting the 'embedContent' generation method,
 * and logs their names to the console.
 *
 * @async
 * @function run
 * @returns {Promise<void>} No return value.
 * @throws {Error} Logs an error message if the API request fails or is misconfigured.
 *
 * Side Effects:
 * - Makes a network request to the Google GenAI API.
 * - Logs model names or error messages to standard output.
 */
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
