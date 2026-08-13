const express = require("express");
const { generateEmbeddings } = require("../controllers/embeddingController");

const router = express.Router();

router.post("/generate", generateEmbeddings);

module.exports = router;
