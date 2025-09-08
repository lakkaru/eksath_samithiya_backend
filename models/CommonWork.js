const mongoose = require("mongoose");

const CommonWorkSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    absents: {
      type: [Number], // Array of member IDs who were absent
      default: [],
    },
    remarks: {
      type: String,
      default: "",
    },
    totalExpectedMembers: {
      type: Number,
      default: 0,
    },
    totalPresentMembers: {
      type: Number,
      default: 0,
    },
    totalFineAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically manage `createdAt` and `updatedAt` fields
  }
);

// Add index for efficient date-based queries
CommonWorkSchema.index({ date: 1 });

module.exports = mongoose.model("CommonWork", CommonWorkSchema);
