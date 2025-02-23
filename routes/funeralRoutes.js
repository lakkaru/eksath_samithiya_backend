const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {getLastAssignmentInfo, createFuneral, getFuneralByDeceasedId, updateFuneralAbsents} = require("../controllers/funeralController");


router.get("/getLastAssignmentInfo",  authMiddleware(['vice-secretary']), getLastAssignmentInfo);
router.post("/createFuneral",  authMiddleware(['vice-secretary']), createFuneral);
router.get("/getFuneralId",  authMiddleware(['vice-secretary']), getFuneralByDeceasedId);
router.post("/funeralAbsents",  authMiddleware(['vice-secretary']), updateFuneralAbsents);

module.exports = router;