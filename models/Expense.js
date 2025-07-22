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
      enum: [
        // === සාමාජික ප්‍රතිලාභ (Member Benefits) ===
        'මරණ ප්‍රතිලාභ ගෙවීම්',
        'ක්ෂණික ප්‍රතිලාභ ගෙවීම්',
        'මළවුන් රැගෙන යාමේ ගාස්තු',
        'ද්‍රව්‍ය ආධාර හිග',
        'කලත්‍රයාගේ දෙමව්පිය මරණ ප්‍රතිලාභ ගෙවීම්',
        
        // === සේවා වියදම් (Service Expenses) ===
        'කූඩාරම් හසුරුවීම - කම්කරු ගාස්තු',
        'පිඟන් නිකුත් කිරීම',
        'පුටු නිකුත් කිරීම',
        'බුෆේ සෙට් නිකුත් කිරීම',
        'ශබ්ද විකාශන හසුරුවීම',
        
        // === පරිපාලන වියදම් (Administrative Expenses) ===
        'කාර්යාල වියදම්',
        'සභා වියදම්',
        'සේවකයින්ගේ වැටුප්',
        'ප්‍රවාහන වියදම්',
        
        // === මූල්‍ය වියදම් (Financial Expenses) ===
        'බැංකු තැන්පතු',
        'විදුලි බිල්පත්',
        
        // === මිලදී ගැනීම් සහ නඩත්තු (Purchases & Maintenance) ===
        'මිලදී ගැනීම්',
        'කම්කරු ගාස්තු',
        'නඩත්තු වියදම්',
        
        // === අනෙකුත් වියදම් (Other Expenses) ===
        'අනෙකුත්'
      ]
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
