const mongoose = require('mongoose');
require('dotenv').config();
const { askNexus } = require('./controllers/askNexusController');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexus').then(async () => {
  const req = {
    body: {
      projectId: '6a75db1657f2c5183a0b5a73',
      question: 'What is this project?'
    }
  };
  const res = {
    status: (code) => { console.log('STATUS:', code); return res; },
    json: (data) => { console.log('JSON:', JSON.stringify(data, null, 2)); }
  };
  await askNexus(req, res);
  process.exit(0);
}).catch(console.error);
