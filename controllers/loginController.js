const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Member = require("../models/Member");
const { AdminUser } = require("../models/Admin");

//login member or admin
exports.login = async (req, res) => {
  const { member_id, password } = req.body;
  
  try {
    let user = null;
    let userType = null;
    let roles = [];

    // First check AdminUser collection
    const adminUser = await AdminUser.findOne({ member_id, isActive: true });
    if (adminUser) {
      // Compare password for admin user
      const isMatch = await bcrypt.compare(password, adminUser.password);
      if (isMatch) {
        user = adminUser;
        userType = "admin";
        roles = [adminUser.role];
      }
    }

    // If not found in AdminUser, check Member collection
    if (!user) {
      const member = await Member.findOne({ member_id });
      if (member) {
        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, member.password);
        if (isMatch) {
          user = member;
          userType = "member";
          roles = member.roles || ["member"];
        }
      }
    }

    // If no user found in either collection
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate a JWT token
    const JWT_SECRET = process.env.JWT_SECRET?.trim(); 
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is undefined");
    }
    
    const payload = {
        member_id: user.member_id,
        name: user.name,
        roles: roles,
        userType: userType, // To distinguish between admin and member
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      message: "Login successful",
      token,
      roles: roles,
      userType: userType,
      name: user.name,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Other auth-related methods could go here (e.g., signup, password reset, etc.)
