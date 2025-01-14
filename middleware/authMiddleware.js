const jwt = require("jsonwebtoken");

const authMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract token from headers (Authorization: Bearer <token>)

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      // Attach member data to the request object
      req.member = decoded;

      // Check if the member has the necessary roles (if provided)
      if (requiredRoles.length && !requiredRoles.some(role => decoded.roles.includes(role))) {
        return res.status(403).json({ message: "Access denied: Insufficient roles" });
      }

      next(); // Allow access to the protected route
    } catch (error) {
      return res.status(400).json({ message: "Invalid token" });
    }
  };
};

module.exports = authMiddleware;
