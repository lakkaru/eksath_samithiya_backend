const express = require("express");
const router = express.Router();
const { createReceipts, getReceiptsByDate, deleteReceipt } = require("../controllers/accountController");
const { addExpense, getExpenses, getExpenseSummary, getExpenseById, updateExpense, deleteExpense } = require("../controllers/expenseController");
const { addIncome, getIncomes, getIncomeById, updateIncome, deleteIncome, getIncomeStats } = require("../controllers/incomeController");
const authMiddleware = require("../middleware/authMiddleware");

// Get receipts by date
router.get("/receipts", authMiddleware(['treasurer']), getReceiptsByDate);

// Create new receipt
router.post("/receipts", authMiddleware(['treasurer']), createReceipts);

// Delete receipt - now only needs date and memberId
router.delete("/receipts/:id/:memberId", authMiddleware(['treasurer']), deleteReceipt);

// Expense routes
// Add a new expense
router.post("/expense", authMiddleware(["treasurer"]), addExpense);

// Get expenses with pagination and filtering
router.get("/expenses", authMiddleware(["treasurer"]), getExpenses);

// Get expense summary by category
router.get("/expense-summary", authMiddleware(["treasurer"]), getExpenseSummary);

// Get a single expense by ID
router.get("/expense/:id", authMiddleware(["treasurer"]), getExpenseById);

// Update an expense
router.put("/expense/:id", authMiddleware(["treasurer"]), updateExpense);

// Delete an expense
router.delete("/expense/:id", authMiddleware(["treasurer"]), deleteExpense);

// Income routes
// Add a new income
router.post("/income", authMiddleware(["treasurer"]), addIncome);

// Get incomes with pagination and filtering
router.get("/incomes", authMiddleware(["treasurer"]), getIncomes);

// Get income statistics
router.get("/income-stats", authMiddleware(["treasurer"]), getIncomeStats);

// Get a single income by ID
router.get("/income/:id", authMiddleware(["treasurer"]), getIncomeById);

// Update an income
router.put("/income/:id", authMiddleware(["treasurer"]), updateIncome);

// Delete an income
router.delete("/income/:id", authMiddleware(["treasurer"]), deleteIncome);

//get all info about loans of member for new loan
// router.get(
//   "/memberInfo/:member_id",
//   authMiddleware(["loan-treasurer"]),
//   getMemberLoanInfo
// );
//create new loan
// router.post("/receipts", authMiddleware(['treasurer']), createReceipts);

//get all active loans
// router.get("/active-loans", authMiddleware(["loan-treasurer"]), getActiveLoans);
//get loan of a member
// router.get(
//   "/member/:memberId",
//   authMiddleware(["loan-treasurer"]),
//   getLoanOfMember
// );
//put all payments made for a loan
// router.post(
//   "/Payments",
//   authMiddleware(["loan-treasurer"]),
//   createLoanPayments
// );

module.exports = router;
