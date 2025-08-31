const mongoose = require("mongoose");
const Member = require("./models/Member");
require('dotenv').config(); // Load environment variables

// Connect to MongoDB using environment variable only
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI environment variable is not set!");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));

async function checkViceSecretary() {
  try {
    console.log("Checking for members with vice-secretary role...");
    
    const viceSecretaryMembers = await Member.find({ roles: "vice-secretary" });
    
    console.log(`Found ${viceSecretaryMembers.length} members with vice-secretary role:`);
    
    viceSecretaryMembers.forEach(member => {
      console.log(`- Member ID: ${member.member_id}, Name: ${member.name}, Roles: ${member.roles.join(", ")}`);
    });
    
    if (viceSecretaryMembers.length === 0) {
      console.log("\nNo vice-secretary found. Let's check what admin roles exist:");
      
      const adminMembers = await Member.find({ 
        roles: { $in: ["chairman", "secretary", "treasurer", "loan-treasurer", "vice-secretary", "auditor"] }
      });
      
      console.log(`Found ${adminMembers.length} members with admin roles:`);
      
      adminMembers.forEach(member => {
        console.log(`- Member ID: ${member.member_id}, Name: ${member.name}, Roles: ${member.roles.join(", ")}`);
      });
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    mongoose.connection.close();
  }
}

checkViceSecretary();
