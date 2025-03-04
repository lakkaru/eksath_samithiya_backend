const mongoose = require("mongoose");

const FuneralSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      // default: Date.now, // Default to the current date
    },
    member_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member", // Reference the member collection
      default: null,
    },
    deceased_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dependent", // Reference the dependent collection
      default: null,
    },
    cemeteryAssignments: {
      type: Array,
      default: []
    },
    funeralAssignments: {
      type: Array,
      default: []
    },
    removedMembers: {
      type: Array,
      default: []
    },
    assignmentAbsents: {
      type: Array,
      default: []
    },
    eventAbsents: {
      type: Array,
      default: []
    },
    extraDueMembers: {
      type: Array,
      default: []
    },
    
  },
  {
    timestamps: true, // Automatically manage `createdAt` and `updatedAt` fields
  }
);

module.exports = mongoose.model("Funeral", FuneralSchema);
