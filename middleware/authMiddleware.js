const jwt = require("jsonwebtoken");

const authMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach member data to the request object
      req.member = decoded;

      // Check if the member has the necessary roles (if provided)
      if (requiredRoles.length && !requiredRoles.some(role => decoded.roles.includes(role))) {
        return res.status(403).json({ message: "Access denied: Insufficient roles" });
      }

      next(); // Proceed to the next middleware/route
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        console.error("JWT Verify Error:", error);
        return res.status(401).json({ message: "Token expired, please log in again." });
      }

      console.error("JWT Verify Error:", error);
      return res.status(400).json({ message: "Invalid token" });
    }
  };
};

module.exports = authMiddleware;
