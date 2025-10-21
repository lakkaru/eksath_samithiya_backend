const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {getAttendance, saveAttendance, getMeetingByDate, getMeetingFines} = require("../controllers/attendanceController");


router.get("/attendance",  authMiddleware(['vice-secretary']), getAttendance);
router.get("/attendance/date",  authMiddleware(['vice-secretary']), getMeetingByDate);
router.get("/fines/:meeting_id",  authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getMeetingFines);
router.post("/absents",  authMiddleware(['vice-secretary']), saveAttendance);

module.exports = router;