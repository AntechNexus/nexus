const express = require("express");
const { askNexus, getConversations, getConversationById, regenerateMessage } = require("../controllers/askNexusController");

const router = express.Router();

router.post("/ask", askNexus);
router.post("/regenerate", regenerateMessage);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversationById);

module.exports = router;
