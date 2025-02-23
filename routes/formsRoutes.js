const express = require("express");
const router = express.Router();
const { getDueForMeetingSign } = require("../controllers/memberController");
const authMiddleware = require("../middleware/authMiddleware");

// Get receipts by date
router.get("/meeting-sign-due", authMiddleware(['vice-secretary']), getDueForMeetingSign);

module.exports = router;