const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Member = require("../models/Member");

//login member
exports.login = async (req, res) => {
  const { member_id, password } = req.body;
//   console.log(req.body.data.token);
  try {
    // Find member by member_id
    const member = await Member.findOne({ member_id });
    if (!member) {
      return res.status(400).json({ message: "Member not found" });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // console.log("process.env.JWT_SECRET ", process.env.JWT_SECRET);
    // console.log(" member.roles :", member.roles);
    // Generate a JWT token
    const JWT_SECRET = process.env.JWT_SECRET?.trim(); 
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is undefined");
    }
    const payload = {
        member_id: member.member_id,
        name:member.name, // Member ID
        roles: member.roles, // Roles for the member
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    // console.log("Generated Token:", token);

//     const token = jwt.sign(payload, "eksath_wilbagedara_samithiya", { expiresIn: "1h" });
// console.log("Generated Token:", token);


    res.status(200).json({
      message: "Login successful",
      token,
      roles: member.roles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Other auth-related methods could go here (e.g., signup, password reset, etc.)
