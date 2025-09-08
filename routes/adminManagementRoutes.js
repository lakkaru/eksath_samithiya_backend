const express = require('express');
const router = express.Router();
const { Admin, AdminUser } = require('../models/Admin');
const Member = require('../models/Member');

// Get admin structure
router.get('/admin-structure', async (req, res) => {
  try {
    const adminUsers = await AdminUser.find({});
    let admin = await Admin.findOne({});
    
    // Initialize admin document if it doesn't exist
    if (!admin) {
      admin = new Admin({});
      await admin.save();
    }
    
    // Get main officers from Admin collection
    const mainOfficers = [];
    const officerRoles = ['chairman', 'secretary', 'viceChairman', 'viceSecretary', 'treasurer', 'loanTreasurer', 'auditor', 'speakerHandler'];
    
    for (const role of officerRoles) {
      if (admin[role] && admin[role].memberId) {
        // Get additional member details
        const memberData = await Member.findOne({ member_id: admin[role].memberId })
          .select('member_id name area phone mobile whatsApp');
        
        if (memberData) {
          mainOfficers.push({
            role: role,
            member_id: admin[role].memberId,
            name: admin[role].name,
            area: memberData.area,
            phone: memberData.phone,
            mobile: memberData.mobile,
            whatsApp: memberData.whatsApp,
            roles: [role] // For compatibility with frontend
          });
        }
      }
    }
    
    // Get area officers
    let areaOfficers = [];
    admin.areaAdmins.forEach(areaAdmin => {
      if (areaAdmin.memberId) {
        areaOfficers.push({
          memberId: areaAdmin.memberId,
          name: areaAdmin.name,
          area: areaAdmin.area,
          role: 'area-admin'
        });
      }
      if (areaAdmin.helper1 && areaAdmin.helper1.memberId) {
        areaOfficers.push({
          memberId: areaAdmin.helper1.memberId,
          name: areaAdmin.helper1.name,
          area: areaAdmin.area,
          role: 'area-helper-1'
        });
      }
      if (areaAdmin.helper2 && areaAdmin.helper2.memberId) {
        areaOfficers.push({
          memberId: areaAdmin.helper2.memberId,
          name: areaAdmin.helper2.name,
          area: areaAdmin.area,
          role: 'area-helper-2'
        });
      }
    });
    
    // Fetch phone numbers for area officers
    const memberIds = areaOfficers.map(officer => officer.memberId);
    const membersWithPhone = await Member.find({ 
      member_id: { $in: memberIds } 
    }).select('member_id phone mobile whatsApp');
    
    // Add phone data to area officers
    areaOfficers = areaOfficers.map(officer => {
      const memberData = membersWithPhone.find(m => m.member_id === officer.memberId);
      return {
        ...officer,
        phone: memberData?.phone,
        mobile: memberData?.mobile,
        whatsApp: memberData?.whatsApp
      };
    });
    
    res.json({
      adminUsers,
      admin,
      mainOfficers, // Send main officers instead of membersWithRoles
      areaOfficers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update member roles - now updates Admin collection for main officers
router.put('/assign-role', async (req, res) => {
  try {
    const { member_id, roles, name } = req.body;
    
    // Check if member exists
    const member = await Member.findOne({ member_id });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get or create admin document
    let admin = await Admin.findOne({});
    if (!admin) {
      admin = new Admin({});
    }

    // Remove member from all current positions first
    const officerRoles = ['chairman', 'secretary', 'viceChairman', 'viceSecretary', 'treasurer', 'loanTreasurer', 'auditor', 'speakerHandler'];
    officerRoles.forEach(role => {
      if (admin[role] && admin[role].memberId === member_id) {
        admin[role] = { memberId: null, name: "" };
      }
    });

    // Assign new roles (excluding 'member' base role)
    const officerRolesOnly = roles.filter(role => role !== 'member');
    
    for (const role of officerRolesOnly) {
      if (officerRoles.includes(role)) {
        admin[role] = {
          memberId: member_id,
          name: name
        };
      }
    }

    await admin.save();
    
    res.json({ 
      success: true, 
      message: 'Roles updated in Admin collection', 
      member: {
        member_id,
        name,
        roles: officerRolesOnly
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get suitable officers
router.get('/suitable-officers', async (req, res) => {
  try {
    const members = await Member.find({ 
      status: { $ne: 'inactive' },
      deactivated_at: null,
      dateOfDeath: null
    })
    .select('member_id name area roles phone mobile whatsApp email')
    .sort({ name: 1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get members by area (with grouping for administrative areas)
router.get('/members-by-area/:area', async (req, res) => {
  try {
    let { area } = req.params;
    
    // Handle grouped areas - map administrative areas to member areas
    let areaQuery = {};
    if (area === 'වලව් ගංගොඩ') {
      areaQuery = { area: { $in: ['වලව් ගංගොඩ 1', 'වලව් ගංගොඩ 2'] } };
    } else if (area === 'මහවතු ගංගොඩ') {
      areaQuery = { area: { $in: ['මහවතු ගංගොඩ 1', 'මහවතු ගංගොඩ 2'] } };
    } else {
      areaQuery = { area };
    }
    
    const members = await Member.find({ 
      ...areaQuery,
      status: { $ne: 'inactive' },
      deactivated_at: null,
      dateOfDeath: null
    })
    .select('member_id name area roles phone mobile')
    .sort({ name: 1 });
    
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign area admin or helper
router.put('/assign-area-role', async (req, res) => {
  try {
    const { member_id, name, area, role } = req.body;
    
    let admin = await Admin.findOne({});
    if (!admin) {
      admin = new Admin({});
      await admin.save();
    }
    
    let areaAdmin = admin.areaAdmins.find(aa => aa.area === area);
    if (!areaAdmin) {
      areaAdmin = { area, memberId: null, name: "", helper1: {}, helper2: {} };
      admin.areaAdmins.push(areaAdmin);
    }
    
    const areaAdminIndex = admin.areaAdmins.findIndex(aa => aa.area === area);
    if (role === 'area-admin') {
      admin.areaAdmins[areaAdminIndex].memberId = member_id;
      admin.areaAdmins[areaAdminIndex].name = name;
    } else if (role === 'area-helper-1') {
      admin.areaAdmins[areaAdminIndex].helper1 = { memberId: member_id, name };
    } else if (role === 'area-helper-2') {
      admin.areaAdmins[areaAdminIndex].helper2 = { memberId: member_id, name };
    }
    
    await admin.save();
    res.json({ success: true, message: `Assigned ${name} as ${role} for ${area}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove area admin or helper
router.delete('/remove-area-role', async (req, res) => {
  try {
    const { area, role } = req.body;
    
    const admin = await Admin.findOne({});
    if (!admin) {
      return res.status(404).json({ error: 'Admin document not found' });
    }
    
    const areaAdminIndex = admin.areaAdmins.findIndex(aa => aa.area === area);
    if (areaAdminIndex === -1) {
      return res.status(404).json({ error: 'Area admin record not found' });
    }
    
    if (role === 'area-admin') {
      admin.areaAdmins[areaAdminIndex].memberId = null;
      admin.areaAdmins[areaAdminIndex].name = "";
    } else if (role === 'area-helper-1') {
      admin.areaAdmins[areaAdminIndex].helper1 = {};
    } else if (role === 'area-helper-2') {
      admin.areaAdmins[areaAdminIndex].helper2 = {};
    }
    
    await admin.save();
    res.json({ success: true, message: `Removed ${role} for ${area}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
