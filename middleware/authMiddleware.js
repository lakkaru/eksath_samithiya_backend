const jwt = require("jsonwebtoken");

const authMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    // console.log("Token:", token);  // Debugging the token

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    try {
      // console.log("first");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // console.log("Decoded token:", decoded);  // Debugging the decoded token

      // Attach member data to the request object
      req.member = decoded;

      // Check if the member has the necessary roles (if provided)
      if (requiredRoles.length && !requiredRoles.some(role => decoded.roles.includes(role))) {
        return res.status(403).json({ message: "Access denied: Insufficient roles" });
      }

      next(); // Allow access to the protected route
    } catch (error) {
      console.error("JWT Verify Error:", error); // Debugging the error
      return res.status(400).json({ message: "Invalid token" });
    }
  };
};

module.exports = authMiddleware;
