const SystemSettings = require("../models/SystemSettings");

// Cache for frequently accessed settings
const settingsCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Get setting value with caching
const getSettingValue = async (settingName, fallbackEnvVar = null, defaultValue = null) => {
  try {
    // Check cache first
    const cacheKey = settingName;
    const cached = settingsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return cached.value;
    }
    
    // Get from database
    const setting = await SystemSettings.findOne({ settingName });
    let value;
    
    if (setting) {
      value = setting.settingValue;
    } else if (fallbackEnvVar && process.env[fallbackEnvVar]) {
      // Fallback to environment variable
      value = parseFloat(process.env[fallbackEnvVar]) || process.env[fallbackEnvVar];
    } else {
      value = defaultValue;
    }
    
    // Cache the result
    settingsCache.set(cacheKey, {
      value: value,
      timestamp: Date.now()
    });
    
    return value;
  } catch (error) {
    // Fallback to environment variable or default
    if (fallbackEnvVar && process.env[fallbackEnvVar]) {
      return parseFloat(process.env[fallbackEnvVar]) || process.env[fallbackEnvVar];
    }
    return defaultValue;
  }
};

// Clear cache for a specific setting
const clearSettingCache = (settingName) => {
  if (settingName) {
    settingsCache.delete(settingName);
  } else {
    settingsCache.clear();
  }
};

// Get financial settings
const getFinancialSettings = async () => {
  try {
    const initialCash = await getSettingValue('INITIAL_CASH_ON_HAND', 'INITIAL_CASH_ON_HAND', 0);
    const initialBank = await getSettingValue('INITIAL_BANK_DEPOSIT', 'INITIAL_BANK_DEPOSIT', 0);
    
    return {
      initialCashOnHand: parseFloat(initialCash) || 0,
      initialBankDeposit: parseFloat(initialBank) || 0
    };
  } catch (error) {
    return {
      initialCashOnHand: parseFloat(process.env.INITIAL_CASH_ON_HAND) || 0,
      initialBankDeposit: parseFloat(process.env.INITIAL_BANK_DEPOSIT) || 0
    };
  }
};

// Get fine settings
const getFineSettings = async () => {
  try {
    const funeralWorkFine = await getSettingValue('FUNERAL_WORK_FINE_VALUE', 'FUNERAL_WORK_FINE_VALUE', 1000);
    const cemeteryWorkFine = await getSettingValue('CEMETERY_WORK_FINE_VALUE', 'CEMETERY_WORK_FINE_VALUE', 1000);
    const funeralAttendanceFine = await getSettingValue('FUNERAL_ATTENDANCE_FINE_VALUE', 'FUNERAL_ATTENDANCE_FINE_VALUE', 100);
    const commonWorkFine = await getSettingValue('COMMON_WORK_FINE_VALUE', 'COMMON_WORK_FINE_VALUE', 500);
    
    return {
      funeralWorkFine: parseInt(funeralWorkFine) || 1000,
      cemeteryWorkFine: parseInt(cemeteryWorkFine) || 1000,
      funeralAttendanceFine: parseInt(funeralAttendanceFine) || 100,
      commonWorkFine: parseInt(commonWorkFine) || 500
    };
  } catch (error) {
    return {
      funeralWorkFine: parseInt(process.env.FUNERAL_WORK_FINE_VALUE) || 1000,
      cemeteryWorkFine: parseInt(process.env.CEMETERY_WORK_FINE_VALUE) || 1000,
      funeralAttendanceFine: parseInt(process.env.FUNERAL_ATTENDANCE_FINE_VALUE) || 100,
      commonWorkFine: parseInt(process.env.COMMON_WORK_FINE_VALUE) || 500
    };
  }
};

module.exports = {
  getSettingValue,
  clearSettingCache,
  getFinancialSettings,
  getFineSettings
};
