const mongoose = require("mongoose");
const { AdminUser } = require("../models/Admin");
const connectDB = require("../config/DB");

async function createSuperAdmin() {
  try {
    // Connect to MongoDB using the same method as the main server
    await connectDB();
    console.log("Connected to MongoDB");

    // Check if super admin already exists
    const existingSuperAdmin = await AdminUser.findOne({ 
      member_id: 0, 
      role: 'super-admin' 
    });

    if (existingSuperAdmin) {
      console.log("Super admin already exists!");
      console.log("Member ID: 0");
      console.log("Role: super-admin");
      return;
    }

    // Create super admin
    const superAdmin = new AdminUser({
      member_id: 0,
      name: "Super Administrator",
      role: "super-admin",
      password: "admin", // Will be hashed by pre-save hook
      isActive: true,
    });

    await superAdmin.save();
    
    console.log("Super admin created successfully!");
    console.log("Member ID: 0");
    console.log("Password: admin");
    console.log("Role: super-admin");
    console.log("Please change the default password after first login.");

  } catch (error) {
    console.error("Error creating super admin:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the setup
if (require.main === module) {
  createSuperAdmin();
}

module.exports = createSuperAdmin;
