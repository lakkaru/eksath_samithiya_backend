const express = require("express");
const {
  addExpense,
  getExpenses,
  getExpenseSummary,
} = require("../controllers/expenseController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Route to add a new expense (requires treasurer authentication)
router.post("/expense", authMiddleware(["treasurer"]), addExpense);

// Route to get expenses with pagination and filtering (requires treasurer authentication)
router.get("/expenses", authMiddleware(["treasurer"]), getExpenses);

// Route to get expense summary by category (requires treasurer authentication)
router.get("/expense-summary", authMiddleware(["treasurer"]), getExpenseSummary);

module.exports = router;
