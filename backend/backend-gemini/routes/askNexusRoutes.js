const express = require("express");
const { askNexus, getConversations, getConversationById, regenerateMessage, deleteConversation } = require("../controllers/askNexusController");

const router = express.Router();

router.post("/ask", askNexus);
router.post("/regenerate", regenerateMessage);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversationById);
router.delete("/conversations/:id", deleteConversation);

module.exports = router;
