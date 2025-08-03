const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const {
  getLastBalance,
  saveBalance,
  getAllBalances
} = require('../controllers/periodBalanceController')

const router = express.Router()

// Get the last period balance before a specific date
router.get('/last-balance', authMiddleware(['treasurer', 'chairman']), getLastBalance)

// Save period balance
router.post('/save-balance', authMiddleware(['treasurer']), saveBalance)

// Get all period balances (for history/debugging)
router.get('/all-balances', authMiddleware(['treasurer', 'chairman']), getAllBalances)

module.exports = router
