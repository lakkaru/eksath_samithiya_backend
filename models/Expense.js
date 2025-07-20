const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ExpenseSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidTo: {
      type: String,
      required: false,
      trim: true,
    },
    beneficiaryMemberId: {
      type: Number,
      ref: "Member",
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Expense = mongoose.model("Expense", ExpenseSchema);

module.exports = Expense;
