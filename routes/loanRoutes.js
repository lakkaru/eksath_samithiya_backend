const express = require("express");
const router = express.Router();
const {
  getMemberLoanInfo,
  createLoan,
  getActiveLoans,
  getLoanOfMember,
  createLoanPayments,
} = require("../controllers/loanController");
const authMiddleware = require("../middleware/authMiddleware");

//get all info about loans of member for new loan
router.get(
  "/memberInfo/:member_id",
  authMiddleware(["loan-treasurer"]),
  getMemberLoanInfo
);
//create new loan
router.post("/create", authMiddleware(["loan-treasurer"]), createLoan);

//get all active loans
router.get("/active-loans", authMiddleware(["loan-treasurer"]), getActiveLoans);

//get loan of a member
router.get(
  "/member/:memberId",
  authMiddleware(["loan-treasurer"]),
  getLoanOfMember
);
//put all payments made for a loan
router.post(
  "/Payments",
  authMiddleware(["loan-treasurer"]),
  createLoanPayments
);

module.exports = router;
