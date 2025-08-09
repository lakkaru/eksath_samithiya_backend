const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {getLastAssignmentInfo, createFuneral, getFuneralByDeceasedId, updateFuneralAbsents, updateMemberExtraDueFines, getFuneralExDueMembersByDeceasedId} = require("../controllers/funeralController");


router.get("/getLastAssignmentInfo",  authMiddleware(['vice-secretary']), getLastAssignmentInfo);
router.post("/createFuneral",  authMiddleware(['vice-secretary']), createFuneral);
router.get("/getFuneralId",  authMiddleware(['vice-secretary']), getFuneralByDeceasedId);
router.post("/funeralAbsents",  authMiddleware(['vice-secretary']), updateFuneralAbsents);
router.post("/updateMemberExtraDueFines",  authMiddleware(['vice-secretary', 'treasurer']), updateMemberExtraDueFines);
router.get("/getFuneralExDueMembersByDeceasedId",  authMiddleware(['vice-secretary', 'treasurer']), getFuneralExDueMembersByDeceasedId);

module.exports = router;