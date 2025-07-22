const mongoose = require('mongoose')

const periodBalanceSchema = new mongoose.Schema({
  periodStartDate: {
    type: Date,
    required: true
  },
  periodEndDate: {
    type: Date,
    required: true,
    unique: true
  },
  endingCashOnHand: {
    type: Number,
    required: true,
    default: 0
  },
  endingBankDeposit: {
    type: Number,
    required: true,
    default: 0
  },
  totalIncome: {
    type: Number,
    required: true,
    default: 0
  },
  totalExpense: {
    type: Number,
    required: true,
    default: 0
  },
  netCashFlow: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
})

// Index for faster queries
periodBalanceSchema.index({ periodEndDate: -1 })

module.exports = mongoose.model('PeriodBalance', periodBalanceSchema)
