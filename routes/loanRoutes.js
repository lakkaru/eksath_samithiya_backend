const express = require("express");
const router = express.Router();
const {
  getMemberLoanInfo,
  createLoan,
  getActiveLoans,
  getLoanOfMember,
  createLoanPayments,
  getLoanPaymentsReport,
  updateLoanPayment,
  deleteLoanPayment,
  updateLoan,
  deleteLoan,
  getLoanById,
  getNextLoanNumber,
} = require("../controllers/loanController");
const authMiddleware = require("../middleware/authMiddleware");

//get all info about loans of member for new loan
router.get(
  "/memberInfo/:member_id",
  authMiddleware(["loan-treasurer", "treasurer", "chairman"]),
  getMemberLoanInfo
);

//get next available loan number
router.get(
  "/next-loan-number",
  authMiddleware(["loan-treasurer"]),
  getNextLoanNumber
);

//create new loan
router.post("/create", authMiddleware(["loan-treasurer"]), createLoan);

//get all active loans
router.get("/active-loans", authMiddleware(["loan-treasurer", "treasurer", "chairman"]), getActiveLoans);


//get loan of a member
router.get(
  "/member/:memberId",
  authMiddleware(["loan-treasurer", "treasurer", "chairman"]),
  getLoanOfMember
);
//put all payments made for a loan
router.post(
  "/Payments",
  authMiddleware(["loan-treasurer"]),
  createLoanPayments
);

//get loan payments report within date range
router.get(
  "/payments-report",
  authMiddleware(["loan-treasurer"]),
  getLoanPaymentsReport
);

//update loan payment
router.put(
  "/payment/:paymentId",
  authMiddleware(["loan-treasurer"]),
  updateLoanPayment
);

//delete loan payment
router.delete(
  "/payment/:paymentId",
  authMiddleware(["loan-treasurer"]),
  deleteLoanPayment
);

//get single loan by ID
router.get(
  "/:id",
  authMiddleware(["loan-treasurer", "treasurer", "chairman"]),
  getLoanById
);

//update loan
router.put(
  "/:id",
  authMiddleware(["loan-treasurer"]),
  updateLoan
);

//delete loan
router.delete(
  "/:id",
  authMiddleware(["loan-treasurer"]),
  deleteLoan
);

module.exports = router;
