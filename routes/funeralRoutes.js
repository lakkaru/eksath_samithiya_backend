const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {getLastAssignmentInfo, createFuneral, getFuneralByDeceasedId, updateFuneralAbsents, updateMemberExtraDueFines, getFuneralExDueMembersByDeceasedId, getAvailableFunerals, getFuneralById, updateWorkAttendance} = require("../controllers/funeralController");


router.get("/getLastAssignmentInfo",  authMiddleware(['vice-secretary']), getLastAssignmentInfo);
router.post("/createFuneral",  authMiddleware(['vice-secretary']), createFuneral);
router.get("/getFuneralId",  authMiddleware(['vice-secretary']), getFuneralByDeceasedId);
router.post("/funeralAbsents",  authMiddleware(['vice-secretary']), updateFuneralAbsents);
router.post("/updateMemberExtraDueFines",  authMiddleware(['vice-secretary', 'treasurer']), updateMemberExtraDueFines);
router.get("/getFuneralExDueMembersByDeceasedId",  authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getFuneralExDueMembersByDeceasedId);
router.get("/getAvailableFunerals",  authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getAvailableFunerals);
router.get("/getFuneralById/:funeralId",  authMiddleware(['vice-secretary', 'treasurer', 'auditor']), getFuneralById);
router.post("/updateWorkAttendance",  authMiddleware(['vice-secretary', 'treasurer', 'auditor']), updateWorkAttendance);

module.exports = router;