const SystemSettings = require("../models/SystemSettings");
const { AdminUser } = require("../models/Admin");

// Helper function to get AdminUser ObjectId from JWT member_id
const getAdminUserObjectId = async (memberIdFromToken) => {
  const adminUser = await AdminUser.findOne({ member_id: memberIdFromToken });
  if (!adminUser) {
    throw new Error("Admin user not found");
  }
  return adminUser._id;
};

// Get all system settings
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find()
      .sort({ settingType: 1, settingName: 1 });
    
    res.status(200).json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ 
      success: false, 
      message: "පද්ධති සැකසුම් ලබා ගැනීමේදී දෝෂයක් ඇති විය" 
    });
  }
};

// Get setting by name
exports.getSettingByName = async (req, res) => {
  try {
    const { settingName } = req.params;
    const setting = await SystemSettings.findOne({ settingName });
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        message: "සැකසුම සොයා ගත නොහැක" 
      });
    }
    
    res.status(200).json({
      success: true,
      setting: setting
    });
  } catch (error) {
    console.error("Error fetching setting:", error);
    res.status(500).json({ 
      success: false, 
      message: "සැකසුම ලබා ගැනීමේදී දෝෂයක් ඇති විය" 
    });
  }
};

// Update system setting
exports.updateSetting = async (req, res) => {
  try {
    const { settingName } = req.params;
    const { settingValue, updateReason } = req.body;
    const userMemberId = req.user.member_id; // Use member_id from JWT payload
    
    // Get AdminUser ObjectId
    const userId = await getAdminUserObjectId(userMemberId);
    
    // Validate required fields
    if (settingValue === undefined || settingValue === null) {
      return res.status(400).json({ 
        success: false, 
        message: "සැකසුම් අගය අවශ්‍ය වේ" 
      });
    }
    
    // Check if setting exists
    const existingSetting = await SystemSettings.findOne({ settingName });
    if (!existingSetting) {
      return res.status(404).json({ 
        success: false, 
        message: "සැකසුම සොයා ගත නොහැක" 
      });
    }
    
    // Update the setting
    const updatedSetting = await SystemSettings.updateSetting(
      settingName, 
      settingValue, 
      userId, 
      updateReason || ''
    );
    
    res.status(200).json({
      success: true,
      message: "සැකසුම සාර්ථකව යාවත්කාලීන කරන ලදී",
      setting: updatedSetting
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ 
      success: false, 
      message: "සැකසුම යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය" 
    });
  }
};

// Initialize default settings (for setup)
exports.initializeDefaultSettings = async (req, res) => {
  try {
    const userMemberId = req.user.member_id; // Use member_id from JWT payload
    
    if (userMemberId === undefined || userMemberId === null) {
      return res.status(400).json({
        success: false,
        message: "User ID not found in token"
      });
    }
    
    // Get AdminUser ObjectId
    const userId = await getAdminUserObjectId(userMemberId);
    
    const defaultSettings = [
      {
        settingName: 'INITIAL_CASH_ON_HAND',
        settingValue: 18944.00,
        settingType: 'financial',
        description: 'පද්ධතිය ආරම්භයේදී මුදල් අතට',
        updatedBy: userId
      },
      {
        settingName: 'INITIAL_BANK_DEPOSIT',
        settingValue: 1209680.03,
        settingType: 'financial',
        description: 'පද්ධතිය ආරම්භයේදී බැංකු තැන්පතු',
        updatedBy: userId
      },
      {
        settingName: 'FUNERAL_WORK_FINE_VALUE',
        settingValue: 1000,
        settingType: 'fine',
        description: 'අවමංගල්‍ය කටයුතු දඩ මුදල',
        updatedBy: userId
      },
      {
        settingName: 'CEMETERY_WORK_FINE_VALUE',
        settingValue: 1000,
        settingType: 'fine',
        description: 'සුසන භුමි කටයුතු දඩ මුදල',
        updatedBy: userId
      },
      {
        settingName: 'FUNERAL_ATTENDANCE_FINE_VALUE',
        settingValue: 100,
        settingType: 'fine',
        description: 'අවමංගල්‍ය උත්සව පැමිණීම් දඩ මුදල',
        updatedBy: userId
      },
      {
        settingName: 'COMMON_WORK_FINE_VALUE',
        settingValue: 500,
        settingType: 'fine',
        description: 'සාමූහික වැඩ පැමිණීම් දඩ මුදල',
        updatedBy: userId
      }
    ];
    
    const createdSettings = [];
    
    for (const settingData of defaultSettings) {
      // Check if setting already exists
      const existingSetting = await SystemSettings.findOne({ settingName: settingData.settingName });
      
      if (!existingSetting) {
        const newSetting = new SystemSettings(settingData);
        await newSetting.save();
        createdSettings.push(newSetting);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `${createdSettings.length} නව සැකසුම් ආරම්භ කරන ලදී`,
      createdSettings: createdSettings
    });
  } catch (error) {
    console.error("Error initializing settings:", error);
    res.status(500).json({ 
      success: false, 
      message: "සැකසුම් ආරම්භ කිරීමේදී දෝෂයක් ඇති විය" 
    });
  }
};

// Get settings by type
exports.getSettingsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['financial', 'fine', 'general'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "වලංගු නොවන සැකසුම් වර්ගය" 
      });
    }
    
    const settings = await SystemSettings.find({ settingType: type })
      .populate('updatedBy', 'username')
      .sort({ settingName: 1 });
    
    res.status(200).json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error("Error fetching settings by type:", error);
    res.status(500).json({ 
      success: false, 
      message: "සැකසුම් ලබා ගැනීමේදී දෝෂයක් ඇති විය" 
    });
  }
};

// Get fine settings (accessible to all authenticated users)
exports.getFineSettings = async (req, res) => {
  try {
    const fineSettings = await SystemSettings.find({
      settingName: { 
        $in: ['FUNERAL_ATTENDANCE_FINE_VALUE', 'FUNERAL_WORK_FINE_VALUE', 'CEMETERY_WORK_FINE_VALUE', 'COMMON_WORK_FINE_VALUE'] 
      }
    }).select('settingName settingValue');

    const fineData = {
      funeralAttendanceFine: 100, // default values
      funeralWorkFine: 1000,
      cemeteryWorkFine: 1000,
      commonWorkFine: 500
    };

    fineSettings.forEach(setting => {
      switch(setting.settingName) {
        case 'FUNERAL_ATTENDANCE_FINE_VALUE':
          fineData.funeralAttendanceFine = parseInt(setting.settingValue) || 100;
          break;
        case 'FUNERAL_WORK_FINE_VALUE':
          fineData.funeralWorkFine = parseInt(setting.settingValue) || 1000;
          break;
        case 'CEMETERY_WORK_FINE_VALUE':
          fineData.cemeteryWorkFine = parseInt(setting.settingValue) || 1000;
          break;
        case 'COMMON_WORK_FINE_VALUE':
          fineData.commonWorkFine = parseInt(setting.settingValue) || 500;
          break;
      }
    });

    res.status(200).json({
      success: true,
      fineSettings: fineData
    });
  } catch (error) {
    console.error("Error getting fine settings:", error);
    res.status(500).json({ 
      success: false, 
      message: "දඩ සැකසුම් ලබා ගැනීමේදී දෝෂයක් ඇති විය" 
    });
  }
};

// Upsert a setting (create if not exists or update existing) - super-admin only
exports.upsertSetting = async (req, res) => {
  try {
    const { settingName, settingValue, settingType = 'general', description = '' } = req.body;
    const userMemberId = req.user.member_id; // Use member_id from JWT payload

    if (!settingName) {
      return res.status(400).json({ success: false, message: 'settingName is required' });
    }

    // Get AdminUser ObjectId
    const userId = await getAdminUserObjectId(userMemberId);

    const existing = await SystemSettings.findOne({ settingName });
    if (existing) {
      const updated = await SystemSettings.updateSetting(settingName, settingValue, userId, 'Upsert from admin UI');
      return res.status(200).json({ success: true, message: 'Setting updated', setting: updated });
    }

    // Create new setting
    const newSetting = new SystemSettings({
      settingName,
      settingValue,
      settingType,
      description,
      updatedBy: userId
    });
    await newSetting.save();
    return res.status(201).json({ success: true, message: 'Setting created', setting: newSetting });
  } catch (error) {
    console.error('Error upserting setting:', error);
    res.status(500).json({ success: false, message: 'සැකසුම upsert කිරීමේදී දෝෂයක් ඇති විය' });
  }
};
