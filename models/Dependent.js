const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DependentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    birthday: {
      type: Date,
      required: true,
    },
    nic: {
      type: String,
      default: null,
      trim: true,
    },
    dateOfDeath: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Auto-manage created_at and updated_at fields
  }
);

const Dependent = mongoose.model("Dependent", DependentSchema);

module.exports = Dependent;
