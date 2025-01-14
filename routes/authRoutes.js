const express = require("express");
const authController = require("../controllers/loginController");

const router = express.Router();

// Login route
router.post("/login", authController.login);

// Other authentication routes (e.g., signup, password reset) can be added here

module.exports = router;
