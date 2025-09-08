const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {getAttendance, saveAttendance, getMeetingByDate} = require("../controllers/attendanceController");


router.get("/attendance",  authMiddleware(['vice-secretary']), getAttendance);
router.get("/attendance/date",  authMiddleware(['vice-secretary']), getMeetingByDate);
router.post("/absents",  authMiddleware(['vice-secretary']), saveAttendance);

module.exports = router;