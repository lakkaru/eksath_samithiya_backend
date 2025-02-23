const express = require("express");
// const memberController=require('../controllers/memberController')
const {
  getMemberById,
  getProfileInfo,
  updateProfileInfo,
  getMemberHasLoanById,
  getMyLoan,
  getMember,
  getPayments,
  getMemberDueById,
  getFamily,
  updateDiedStatus,
  updateDependentDiedStatus,
  getActiveMembers,
  getAdminsForFuneral,
  getMembershipDeathById,
  getNextId,
  getMemberIdsForFuneralAttendance,
} = require("../controllers/memberController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Route to get member profile information (requires authentication)
router.get("/profile", authMiddleware(), getProfileInfo);
// Route to update member profile information (requires authentication)
router.put("/profile", authMiddleware(), updateProfileInfo);
// Route to get  member info (requires authentication)
router.get("/hasLoan", authMiddleware(), getMemberHasLoanById);
router.get("/myLoan", authMiddleware(), getMyLoan);
router.get("/getMemberById/:memberId", authMiddleware(), getMemberById);
router.get("/info", authMiddleware(), getMember);
router.get("/payments", authMiddleware(), getPayments);
router.get("/due", authMiddleware(), getMemberDueById);
//for vice-secretory
router.get(
  "/getFamily/:member_id",
  authMiddleware(["vice-secretary"]),
  getFamily
);
router.post(
  "/updateDiedStatus",
  authMiddleware(["vice-secretary"]),
  updateDiedStatus
);
router.post(
  "/updateDependentDiedStatus",
  authMiddleware(["vice-secretary"]),
  updateDependentDiedStatus
);
router.get(
  "/getActiveMembers",
  authMiddleware(["vice-secretary"]),
  getActiveMembers
);
router.get(
  "/getAdminsForFuneral",
  authMiddleware(["vice-secretary"]),
  getAdminsForFuneral
);
router.get(
  "/getMembershipDeathById",
  authMiddleware(["vice-secretary"]),
  getMembershipDeathById
);
router.get("/getNextId", authMiddleware(["vice-secretary"]), getNextId);
router.get("/getMemberIdsForFuneralAttendance", authMiddleware(["vice-secretary"]), getMemberIdsForFuneralAttendance);

// Route to get member id object by member_id (requires authentication)
// router.get("/_id/:memberId", authMiddleware(), get_id);
// Route to get member  basic info by member_id(requires authentication)

//getting admins for work assignments
// router.get("/getAdminsForFuneral", adminController.getAdminsForFuneral);
// router.get("/get-all-data-by-id",authMiddleware(["vice-secretory"]) , getAllDataById);
// get-admin-for-

//create member
// router.post("/create", memberController.createMember);
module.exports = router;
