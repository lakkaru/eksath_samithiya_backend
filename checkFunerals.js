const mongoose = require("mongoose");
const Funeral = require("./models/Funeral");
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

async function checkFunerals() {
  try {
    console.log("Checking funeral records in database...");
    
    const funeralCount = await Funeral.countDocuments();
    console.log(`Total funerals in database: ${funeralCount}`);
    
    if (funeralCount > 0) {
      const latestFunerals = await Funeral.find()
        .populate("member_id", "name area")
        .sort({ date: -1 })
        .limit(5);
      
      console.log("\nLatest 5 funerals:");
      latestFunerals.forEach((funeral, index) => {
        console.log(`${index + 1}. Date: ${funeral.date?.toISOString()?.split('T')[0]}, Member: ${funeral.member_id?.name || 'Unknown'}, Area: ${funeral.member_id?.area || 'Unknown'}`);
        console.log(`   Cemetery Assignments: ${funeral.cemeteryAssignments?.length || 0}`);
        console.log(`   Funeral Assignments: ${funeral.funeralAssignments?.length || 0}`);
      });
    } else {
      console.log("No funeral records found in database.");
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error("Error checking funerals:", error);
    mongoose.connection.close();
  }
}

checkFunerals();
