const express = require('express');
const multer = require('multer');
const { handleUpload } = require('../controllers/uploadController');
const { handleGeneratePrd } = require('../controllers/prdController');
const { handleSummary } = require('../controllers/summaryController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.array('files', 10), handleUpload);
router.post('/generate-prd', handleGeneratePrd);

// Transcript routes
const { handleTranscribe, updateTranscript } = require('../controllers/transcribeController');
router.get('/files/:id/transcribe', handleTranscribe);
router.put('/files/:id/transcribe', updateTranscript);

router.get('/files/:id/summary', handleSummary);

// Ask Nexus & Embeddings
const askNexusRoutes = require('./askNexusRoutes');
const embeddingRoutes = require('./embeddingRoutes');
router.use('/ask-nexus', askNexusRoutes);
router.use('/embeddings', embeddingRoutes);

module.exports = router;
