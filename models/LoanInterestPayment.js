const mongoose = require("mongoose");

// Define the schema for loan interest payments
const LoanInterestPaymentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      // default: Date.now, // Automatically sets the current date if not provided
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the Loans collection
      required: true,
      ref: "Loan", // Reference to the Loan model
      index: true, // Adds an index for faster queries
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be a positive number"],
    },
  },
  {
    timestamps: true, // Automatically manage `createdAt` and `updatedAt` fields
  }
);

// Add a method to summarize the payment
LoanInterestPaymentSchema.methods.getSummary = function () {
  return {
    date: this.date,
    loanId: this.loanId,
    amount: this.amount,
  };
};

// Create the model from the schema
const LoanInterestPayment = mongoose.model(
  "LoanInterestPayment",
  LoanInterestPaymentSchema
);

module.exports = LoanInterestPayment;
