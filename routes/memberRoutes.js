const express = require("express");
// const memberController=require('../controllers/memberController')
const {
  getMemberById,
  getProfileInfo,
  updateProfileInfo,
  getMemberHasLoanById,
  getMyLoan,
  // getMemberLoanInfo,
  blacklistDueLoanMembers,
  getMember,
  getPayments,
  getFines,
  getMemberDueById,
  getFamily,
  updateDiedStatus,
  updateDependentDiedStatus,
  getActiveMembers,
  getAdminsForFuneral,
  getMembershipDeathById,
  getMemberAllInfoById,
  getNextId,
  getMemberIdsForFuneralAttendance,
  getMembersForMeetingAttendance,
  deleteFineById,
  createMember,
  searchMembersByArea,
  searchMembersByName,
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
// router.get("/memberLoan", authMiddleware(), getMemberLoanInfo);
router.get("/getMemberById/:memberId", authMiddleware(), getMemberById);
router.get("/info", authMiddleware(), getMember);
router.get("/payments", authMiddleware(), getPayments);
router.get("/fines", authMiddleware(), getFines);
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
router.get(
  "/getMemberAllInfoById",
  authMiddleware(["vice-secretary", "treasurer", "loan-treasurer"]),
  getMemberAllInfoById
);
router.get("/getNextId", authMiddleware(["vice-secretary"]), getNextId);
router.get("/getMemberIdsForFuneralAttendance", authMiddleware(["vice-secretary"]), getMemberIdsForFuneralAttendance);
router.get("/getMembersForMeetingAttendance", authMiddleware(["vice-secretary"]), getMembersForMeetingAttendance);
router.post("/deleteFine", authMiddleware(["vice-secretary"]), deleteFineById);

//backlist loan overdue members
router.get("/blacklist", authMiddleware(["loan-treasurer"]), blacklistDueLoanMembers);

// Route to get member id object by member_id (requires authentication)
// router.get("/_id/:memberId", authMiddleware(), get_id);
// Route to get member  basic info by member_id(requires authentication)

//getting admins for work assignments
// router.get("/getAdminsForFuneral", adminController.getAdminsForFuneral);
// router.get("/get-all-data-by-id",authMiddleware(["vice-secretory"]) , getAllDataById);
// get-admin-for-

//create member
router.post("/create", authMiddleware(["vice-secretary"]), createMember);
//search members by area
router.get("/searchByArea", authMiddleware(["vice-secretary"]), searchMembersByArea);
//search members by name
router.get("/searchByName", authMiddleware(["vice-secretary"]), searchMembersByName);
module.exports = router;
