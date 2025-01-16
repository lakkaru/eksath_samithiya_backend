const mongoose = require("mongoose");

const loanPaymentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      // default: Date.now, // Default to the current date
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan", // Reference the Loan collection
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0, // Ensure no negative amounts
    },
  },
  {
    timestamps: true, // Automatically manage `createdAt` and `updatedAt` fields
  }
);

module.exports = mongoose.model("LoanPayment", loanPaymentSchema);
