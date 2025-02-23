const mongoose = require("mongoose");

// Sub-schema for main admin roles
const mainAdminSchema = new mongoose.Schema(
  {
    memberId: { type: Number},
    name: { type: String},
  },
  { _id: false } // Disable `_id` for this sub-schema
);

// Sub-schema for area admin roles, including helpers
const areaAdminSchema = new mongoose.Schema(
  {
    area: { type: String },
    memberId: { type: Number },
    name: { type: String},
    helper1: {
      memberId: { type: Number },
      name: { type: String },
    },
    helper2: {
      memberId: { type: Number },
      name: { type: String },
    },
  },
  { _id: false } // Disable `_id` for this sub-schema
);

// Main admin schema
const adminSchema = new mongoose.Schema(
  {
    chairman: { type: mainAdminSchema, default: () => ({}) },
    secretary: { type: mainAdminSchema, default: () => ({}) },
    viceChairman: { type: mainAdminSchema, default: () => ({}) },
    viceSecretary: { type: mainAdminSchema, default: () => ({}) },
    treasurer: { type: mainAdminSchema, default: () => ({}) },
    loanTreasurer: { type: mainAdminSchema, default: () => ({}) },
    speakerHandler: { type: mainAdminSchema, default: () => ({}) },
    areaAdmins: { type: [areaAdminSchema], default: [] },
  },
  {
    timestamps: true, // Automatically add `createdAt` and `updatedAt` fields
  }
);

// Export the model
const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
