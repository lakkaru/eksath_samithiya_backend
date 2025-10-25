const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getCommonWorkById,
  getCommonWorkByDate,
  getAllCommonWorks,
  saveCommonWorkAttendance,
  deleteCommonWork,
  getCommonWorkStats,
  getCommonWorkFineAmount
} = require("../controllers/commonWorkController");

// Get all common works with filtering and pagination
router.get("/", authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getAllCommonWorks);

// Get common work statistics
router.get("/stats", authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getCommonWorkStats);

// Get common work by date
router.get("/date", authMiddleware(['vice-secretary']), getCommonWorkByDate);

// Get common work by ID
router.get("/:workId", authMiddleware(['vice-secretary']), getCommonWorkById);

// Get fine amount for a common work from member documents
router.get("/fineAmount/:workId", authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getCommonWorkFineAmount);

// Save/update common work attendance
router.post("/attendance", authMiddleware(['vice-secretary']), saveCommonWorkAttendance);

// Delete common work
router.delete("/:workId", authMiddleware(['vice-secretary']), deleteCommonWork);

module.exports = router;
