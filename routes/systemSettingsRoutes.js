const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllSettings,
  getSettingByName,
  updateSetting,
  initializeDefaultSettings,
  getSettingsByType,
  getFineSettings
} = require("../controllers/systemSettingsController");
const { upsertSetting } = require("../controllers/systemSettingsController");

// Get all system settings (super-admin only)
router.get("/", authMiddleware(['super-admin']), getAllSettings);

// Get fine settings (accessible to all authenticated users)
router.get("/fines", authMiddleware(), getFineSettings);

// Initialize default settings (super-admin only)
router.post("/initialize", authMiddleware(['super-admin']), initializeDefaultSettings);

// Get settings by type (super-admin only)
router.get("/type/:type", authMiddleware(['super-admin']), getSettingsByType);

// Get specific setting by name (super-admin only)
router.get("/:settingName", authMiddleware(['super-admin']), getSettingByName);

// Update specific setting (super-admin only)
router.put("/:settingName", authMiddleware(['super-admin']), updateSetting);

// Upsert a setting (create or update) - super-admin only
router.post("/upsert", authMiddleware(['super-admin']), upsertSetting);

module.exports = router;
