const express = require('express')
const PeriodBalance = require('../models/PeriodBalance')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// Get the last period balance before a specific date
router.get('/last-balance', authMiddleware, async (req, res) => {
  try {
    const { beforeDate } = req.query
    
    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: 'beforeDate parameter is required'
      })
    }

    const lastBalance = await PeriodBalance.findOne({
      periodEndDate: { $lt: new Date(beforeDate) }
    }).sort({ periodEndDate: -1 }).limit(1)

    if (!lastBalance) {
      // Return initial amounts from environment if no previous balance found
      return res.json({
        success: true,
        balance: {
          endingCashOnHand: parseFloat(process.env.INITIAL_CASH_ON_HAND || 0),
          endingBankDeposit: parseFloat(process.env.INITIAL_BANK_DEPOSIT || 0),
          periodEndDate: new Date('2024-12-31'), // Year before start
          isInitial: true
        }
      })
    }

    res.json({
      success: true,
      balance: {
        ...lastBalance.toObject(),
        isInitial: false
      }
    })
  } catch (error) {
    console.error('Error fetching last balance:', error)
    res.status(500).json({
      success: false,
      message: 'සම්පත් ත්‍යාගය ගැනීමේදී දෝෂයක් සිදුවිය'
    })
  }
})

// Save period balance
router.post('/save-balance', authMiddleware, async (req, res) => {
  try {
    const { 
      periodEndDate, 
      endingCashOnHand, 
      endingBankDeposit, 
      totalIncome, 
      totalExpense, 
      netCashFlow 
    } = req.body

    if (!periodEndDate || endingCashOnHand === undefined || endingBankDeposit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      })
    }

    // Update or create balance record
    const balance = await PeriodBalance.findOneAndUpdate(
      { periodEndDate: new Date(periodEndDate) },
      {
        endingCashOnHand: parseFloat(endingCashOnHand),
        endingBankDeposit: parseFloat(endingBankDeposit),
        totalIncome: parseFloat(totalIncome || 0),
        totalExpense: parseFloat(totalExpense || 0),
        netCashFlow: parseFloat(netCashFlow || 0)
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    )

    res.json({
      success: true,
      message: 'කාල සීමාවේ ශේෂය සාර්ථකව සුරකිණි',
      balance
    })
  } catch (error) {
    console.error('Error saving balance:', error)
    res.status(500).json({
      success: false,
      message: 'ශේෂය සුරැකීමේදී දෝෂයක් සිදුවිය'
    })
  }
})

// Get all period balances (for history/debugging)
router.get('/all-balances', authMiddleware, async (req, res) => {
  try {
    const balances = await PeriodBalance.find({})
      .sort({ periodEndDate: -1 })
      .limit(50) // Last 50 periods

    res.json({
      success: true,
      balances
    })
  } catch (error) {
    console.error('Error fetching balances:', error)
    res.status(500).json({
      success: false,
      message: 'ශේෂ ලබා ගැනීමේදී දෝෂයක් සිදුවිය'
    })
  }
})

module.exports = router
