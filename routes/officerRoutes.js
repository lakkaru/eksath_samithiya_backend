const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllOfficers,
  getOfficerById,
  createOfficer,
  updateOfficer,
  deactivateOfficer,
  reactivateOfficer,
  deleteOfficer,
  changePassword,
  getOfficersByRole,
} = require("../controllers/officerController");

// Middleware to check super-admin role
const superAdminMiddleware = (req, res, next) => {
  if (!req.user.roles.includes('super-admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin role required.',
    });
  }
  next();
};

// Routes that require super-admin access
router.get("/", authMiddleware, superAdminMiddleware, getAllOfficers);
router.get("/role/:role", authMiddleware, superAdminMiddleware, getOfficersByRole);
router.get("/:id", authMiddleware, superAdminMiddleware, getOfficerById);
router.post("/", authMiddleware, superAdminMiddleware, createOfficer);
router.put("/:id", authMiddleware, superAdminMiddleware, updateOfficer);
router.put("/:id/deactivate", authMiddleware, superAdminMiddleware, deactivateOfficer);
router.put("/:id/reactivate", authMiddleware, superAdminMiddleware, reactivateOfficer);
router.delete("/:id", authMiddleware, superAdminMiddleware, deleteOfficer);

// Password change route (officers can change their own password)
router.put("/:id/change-password", authMiddleware, changePassword);

module.exports = router;