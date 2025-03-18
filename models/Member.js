const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;

const MemberSchema = new Schema(
  {
    member_id: {
      type: Number,
      required: true,
      unique: true, // Ensure member IDs are unique
      index: true, // Add an index for faster lookup
    },
    password: {
      type: String,
      required: true, // Ensure passwords are provided
    },
    name: {
      type: String,
      required: true, // Ensure names are provided
      trim: true, // Trim whitespace
    },
    area: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      // match: /^[0-9]{10}$/, // Ensure valid 10-digit phone numbers
    },
    mobile: {
      type: String,
      // match: /^[0-9]{10}$/, // Ensure valid 10-digit mobile numbers
    },
    whatsApp: {
      type: String,
      // match: /^[0-9]{10}$/, // Ensure valid 10-digit mobile numbers
    },
    address: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true, // Ensure unique email addresses
      lowercase: true, // Convert emails to lowercase
      // match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Validate email format
    },
    nic: {
      type: String,
      unique: true, // Ensure unique NIC numbers
      // match: /^[0-9]{9}[vVxX]$|^[0-9]{12}$/, // Validate NIC (Sri Lankan format)
    },
    birthday: {
      type: Date,
    },
    joined_date: {
      type: Date,
      default: Date.now, // Default to the current date
    },
    dateOfDeath: {
      type: Date,
    },
    dependents: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Dependent" }],
    },
    siblingsCount: { 
      type: Number, 
      default: 0 },
    deactivated_at: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      default: "regular", // regular or other statuses like 'inactive', etc.
    },
    previousDue: {
      type: Number,
      default: 0,
    },
    meetingAbsents: {
      type: Number,
      default: 0,
    },
    fines: [
      {
        eventId: { type: mongoose.Schema.Types.ObjectId },
        eventType: { type: String },
        amount: { type: Number },
      },
    ],
    roles: {
      type: [String],
      enum: [
        "member",
        "chairman",
        "secretary",
        "treasurer",
        "loan-treasurer",
        "vice-secretary",
      ],
      default: ["member"], // Default role is "member"
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Auto-manage created_at and updated_at fields
  }
);

// Add a pre-save hook to set the default password and hash it
MemberSchema.pre("save", async function (next) {
  try {
    if (!this.password) {
      // Log the situation if no password is set
      console.log("No password provided, setting default password");
      this.password = this.member_id.toString();
    }

    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    next();
  } catch (error) {
    console.error("Error in pre-save:", error);
    next(error);
  }
});

// Add additional indexes
// MemberSchema.index({ member_id: 1 });

const Member = mongoose.model("Member", MemberSchema);

module.exports = Member;
