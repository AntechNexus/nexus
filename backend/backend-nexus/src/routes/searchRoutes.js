const express = require("express");
const router = express.Router();
const { globalSearch } = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");

// Mount protect middleware for all search routes
router.use(protect);

router.get("/", globalSearch);

module.exports = router;
