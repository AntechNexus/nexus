const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const { askNexus } = require('./controllers/askNexusController');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexus_ai').then(async () => {
  const req = {
    body: {
      projectId: '6a75db1657f2c5183a0b5a73', // dummy
      question: 'What is this project?'
    }
  };
  const res = {
    /**
     * Sets the HTTP status code for the response.
     *
     * @param {number} code - The HTTP status code to set.
     * @returns {Object} Returns the response object `res` to allow method chaining.
     *
     * Side Effects:
     * - Logs the provided status code to standard output.
     */
    status: (code) => { console.log('STATUS:', code); return res; },
    /**
     * Sends a JSON response.
     *
     * @param {any} data - The data payload to send as a JSON response.
     * @returns {void} No return value.
     *
     * Side Effects:
     * - Formats the data object as a JSON string and logs it to standard output.
     */
    json: (data) => { console.log('JSON:', JSON.stringify(data, null, 2)); }
  };
  await askNexus(req, res);
  process.exit(0);
}).catch(console.error);
