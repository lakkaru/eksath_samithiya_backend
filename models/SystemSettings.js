const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema(
  {
    settingName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    settingValue: {
      type: mongoose.Schema.Types.Mixed, // Can store numbers, strings, etc.
      required: true
    },
    settingType: {
      type: String,
      enum: ['financial', 'fine', 'general'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true
    },
    lastUpdateDate: {
      type: Date,
      default: Date.now
    },
    updateHistory: [{
      previousValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminUser"
      },
      updateDate: {
        type: Date,
        default: Date.now
      },
      updateReason: String
    }]
  },
  {
    timestamps: true
  }
);

// Static method to get setting value
SystemSettingsSchema.statics.getSettingValue = async function(settingName, defaultValue = null) {
  try {
    const setting = await this.findOne({ settingName });
    return setting ? setting.settingValue : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${settingName}:`, error);
    return defaultValue;
  }
};

// Static method to update setting value
SystemSettingsSchema.statics.updateSetting = async function(settingName, newValue, updatedBy, updateReason = '') {
  try {
    const existingSetting = await this.findOne({ settingName });
    
    if (existingSetting) {
      // Add to update history
      existingSetting.updateHistory.push({
        previousValue: existingSetting.settingValue,
        newValue: newValue,
        updatedBy: updatedBy,
        updateDate: new Date(),
        updateReason: updateReason
      });
      
      existingSetting.settingValue = newValue;
      existingSetting.updatedBy = updatedBy;
      existingSetting.lastUpdateDate = new Date();
      
      return await existingSetting.save();
    } else {
      throw new Error(`Setting ${settingName} not found`);
    }
  } catch (error) {
    console.error(`Error updating setting ${settingName}:`, error);
    throw error;
  }
};

module.exports = mongoose.model("SystemSettings", SystemSettingsSchema);
