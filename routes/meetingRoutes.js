const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {saveAttendance} = require("../controllers/attendanceController");


// router.get("/getLastAssignmentInfo",  authMiddleware(['vice-secretary']), getLastAssignmentInfo);
// router.post("/createFuneral",  authMiddleware(['vice-secretary']), createFuneral);
// router.get("/getFuneralId",  authMiddleware(['vice-secretary']), getFuneralByDeceasedId);
router.post("/absents",  authMiddleware(['vice-secretary']), saveAttendance);
// router.post("/updateMemberExtraDueFines",  authMiddleware(['vice-secretary']), updateMemberExtraDueFines);
// router.get("/getFuneralExDueMembersByDeceasedId",  authMiddleware(['vice-secretary']), getFuneralExDueMembersByDeceasedId);

module.exports = router;