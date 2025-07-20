const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member', // Assuming you have a Member model
      required: true,
    },
    guarantor1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member', // Assuming you have a Member model
      required: true,
    },
    guarantor2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member', // Assuming you have a Member model
      required: true,
    },
    loanNumber: {
      type: String,
      required: true,
      unique: true,
    },
    loanAmount: {
      type: Number,
      required: true,
    },
    loanRemainingAmount: {
      type: Number,
      // required: true,
      default:10000
    },
    loanDate: {
      type: Date,
      required: true,
      // default: Date.now,
    },
    settlementDate: {
      type: Date,
      // required: true,
      // default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;
