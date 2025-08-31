const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { AdminUser } = require('../models/Admin');
require('dotenv').config();

const setupSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await AdminUser.findOne({ member_id: 0 });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists with member_id: 0');
      console.log(`Name: ${existingSuperAdmin.name}`);
      console.log(`Role: ${existingSuperAdmin.role}`);
      console.log(`Active: ${existingSuperAdmin.isActive}`);
      return;
    }

    // Create super admin
    const superAdmin = new AdminUser({
      member_id: 0,
      password: 'admin', // Will be hashed by the pre-save middleware
      name: 'Super Admin',
      role: 'super-admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await superAdmin.save();
    console.log('Super admin created successfully!');
    console.log('Login credentials:');
    console.log('Member ID: 0');
    console.log('Password: admin');
    console.log('Role: super-admin');

  } catch (error) {
    console.error('Error setting up super admin:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the setup if this file is executed directly
if (require.main === module) {
  setupSuperAdmin();
}

module.exports = { setupSuperAdmin };
