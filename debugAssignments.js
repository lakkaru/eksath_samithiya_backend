const mongoose = require("mongoose");
const Funeral = require("./models/Funeral");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugAssignments() {
  try {
    // Get one funeral with assignments
    const funeral = await Funeral.findOne({
      $or: [
        { cemeteryAssignments: { $ne: [] } },
        { funeralAssignments: { $ne: [] } }
      ]
    });
    
    if (funeral) {
      console.log("Funeral ID:", funeral._id);
      console.log("Cemetery Assignments:", funeral.cemeteryAssignments);
      console.log("Cemetery Assignments Length:", funeral.cemeteryAssignments?.length);
      console.log("Cemetery Assignments Type:", typeof funeral.cemeteryAssignments);
      console.log("Sample Cemetery Assignment:", funeral.cemeteryAssignments?.[0]);
      
      console.log("Funeral Assignments:", funeral.funeralAssignments);
      console.log("Funeral Assignments Length:", funeral.funeralAssignments?.length);
      console.log("Removed Members:", funeral.removedMembers);
    } else {
      console.log("No funeral with assignments found");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugAssignments();
