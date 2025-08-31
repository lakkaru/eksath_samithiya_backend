const { AdminUser } = require("../models/Admin");
const Member = require("../models/Member");
const bcrypt = require("bcrypt");

// Get all officers
exports.getAllOfficers = async (req, res) => {
  try {
    const officers = await AdminUser.find({ isActive: true }).select('-password');
    res.status(200).json({
      success: true,
      officers: officers,
    });
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching officers',
      error: error.message,
    });
  }
};

// Get officer by ID
exports.getOfficerById = async (req, res) => {
  try {
    const { id } = req.params;
    const officer = await AdminUser.findById(id).select('-password');
    
    if (!officer || !officer.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    res.status(200).json({
      success: true,
      officer: officer,
    });
  } catch (error) {
    console.error('Error fetching officer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching officer',
      error: error.message,
    });
  }
};

// Create new officer
exports.createOfficer = async (req, res) => {
  try {
    const { member_id, name, role, password } = req.body;

    // Validate required fields
    if (!member_id || !name || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: member_id, name, role, password',
      });
    }

    // Check if officer with this member_id already exists
    const existingOfficer = await AdminUser.findOne({ member_id });
    if (existingOfficer) {
      return res.status(400).json({
        success: false,
        message: 'Officer with this member ID already exists',
      });
    }

    // Check if member exists (optional validation)
    const member = await Member.findOne({ member_id });
    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Member with this ID does not exist',
      });
    }

    // Create new officer
    const newOfficer = new AdminUser({
      member_id,
      name,
      role,
      password, // Will be hashed by the pre-save hook
    });

    await newOfficer.save();

    // Return officer data without password
    const { password: _, ...officerData } = newOfficer.toObject();

    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      officer: officerData,
    });
  } catch (error) {
    console.error('Error creating officer:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating officer',
      error: error.message,
    });
  }
};

// Update officer
exports.updateOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating member_id
    delete updateData.member_id;

    // If password is being updated, it will be hashed by the pre-save hook
    const officer = await AdminUser.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Officer updated successfully',
      officer: officer,
    });
  } catch (error) {
    console.error('Error updating officer:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating officer',
      error: error.message,
    });
  }
};

// Deactivate officer (soft delete)
exports.deactivateOfficer = async (req, res) => {
  try {
    const { id } = req.params;

    const officer = await AdminUser.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Officer deactivated successfully',
      officer: officer,
    });
  } catch (error) {
    console.error('Error deactivating officer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating officer',
      error: error.message,
    });
  }
};

// Reactivate officer
exports.reactivateOfficer = async (req, res) => {
  try {
    const { id } = req.params;

    const officer = await AdminUser.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Officer reactivated successfully',
      officer: officer,
    });
  } catch (error) {
    console.error('Error reactivating officer:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating officer',
      error: error.message,
    });
  }
};

// Delete officer permanently (only for super-admin)
exports.deleteOfficer = async (req, res) => {
  try {
    const { id } = req.params;

    const officer = await AdminUser.findByIdAndDelete(id);

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Officer deleted permanently',
    });
  } catch (error) {
    console.error('Error deleting officer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting officer',
      error: error.message,
    });
  }
};

// Change officer password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    const officer = await AdminUser.findById(id);

    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, officer.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password (will be hashed by pre-save hook)
    officer.password = newPassword;
    await officer.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
    });
  }
};

// Get officers by role
exports.getOfficersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    const officers = await AdminUser.find({ 
      role: role, 
      isActive: true 
    }).select('-password');

    res.status(200).json({
      success: true,
      officers: officers,
    });
  } catch (error) {
    console.error('Error fetching officers by role:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching officers by role',
      error: error.message,
    });
  }
};