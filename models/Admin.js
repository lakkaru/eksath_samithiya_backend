const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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

// Individual admin schema for the new admin collection
const adminUserSchema = new mongoose.Schema(
  {
    member_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        "super-admin",
        "chairman", 
        "secretary",
        "vice-chairman",
        "vice-secretary", 
        "treasurer",
        "loan-treasurer",
        "auditor",
        "speaker-handler"
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminUserSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Main admin schema (keeping for organizational structure)
const adminSchema = new mongoose.Schema(
  {
    chairman: { type: mainAdminSchema, default: () => ({}) },
    secretary: { type: mainAdminSchema, default: () => ({}) },
    viceChairman: { type: mainAdminSchema, default: () => ({}) },
    viceSecretary: { type: mainAdminSchema, default: () => ({}) },
    treasurer: { type: mainAdminSchema, default: () => ({}) },
    loanTreasurer: { type: mainAdminSchema, default: () => ({}) },
    auditor: { type: mainAdminSchema, default: () => ({}) }, // Added auditor role
    speakerHandler: { type: mainAdminSchema, default: () => ({}) },
    areaAdmins: { type: [areaAdminSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Export both models
const Admin = mongoose.model("Admin", adminSchema);
const AdminUser = mongoose.model("AdminUser", adminUserSchema);

module.exports = { Admin, AdminUser };
