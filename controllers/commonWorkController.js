const CommonWork = require("../models/CommonWork");
const Member = require("../models/Member");
const { getFineSettings } = require("../utils/settingsHelper");

// Get active member IDs for common work (excludes free members, attendance-free members, and officers)
async function getActiveMemberIdsForCommonWork() {
  const members = await Member.find({
    $or: [
      { deactivated_at: { $exists: false } }, // No deactivatedDate field
      { deactivated_at: null },
    ],
    status: { $nin: ["free", "attendance-free"] }, // Exclude free and attendance-free members
    roles: { $not: { $elemMatch: { $in: ["chairman", "secretary", "treasurer", "loan-treasurer", "vice-secretary", "vice-chairman", "auditor"] } } }, // Exclude officers
  })
    .select("member_id")
    .sort("member_id");

  return members.map((member) => member.member_id);
}

// Get common work by ID
exports.getCommonWorkById = async (req, res) => {
  try {
    const { workId } = req.params;
    
    if (!workId || workId === 'undefined' || workId === 'null') {
      return res.status(400).json({ 
        message: "Invalid common work ID provided." 
      });
    }
    
    const commonWork = await CommonWork.findById(workId);
    
    if (!commonWork) {
      return res.status(404).json({ message: "Common work not found." });
    }
    
    res.status(200).json({
      message: "Common work details fetched successfully.",
      commonWork: commonWork
    });
  } catch (error) {
    console.error("Error fetching common work details:", error);
    res.status(500).json({ 
      message: "Internal server error.",
      error: error.message 
    });
  }
};

// Get common work by date
exports.getCommonWorkByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }
    
    // Parse the date and create date range for the entire day
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Find common work for the specified date
    const commonWork = await CommonWork.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    if (!commonWork) {
      return res.status(200).json({ 
        message: "No common work found for this date",
        commonWork: null
      });
    }
    
    res.status(200).json({
      message: "Common work fetched successfully",
      commonWork: commonWork
    });
  } catch (error) {
    console.error("Error fetching common work by date:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all common works with pagination
exports.getAllCommonWorks = async (req, res) => {
  try {
    const { page = 1, limit = 20, workType, startDate, endDate } = req.query;
    
    const query = {};
    
    // Filter by work type if provided
    if (workType && workType !== 'all') {
      query.workType = workType;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    const commonWorks = await CommonWork.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await CommonWork.countDocuments(query);
    
    res.status(200).json({
      message: "Common works fetched successfully",
      commonWorks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error fetching common works:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create or update common work attendance
exports.saveCommonWorkAttendance = async (req, res) => {
  try {
    const { 
      date, 
      title, 
      remarks, 
      absentArray 
    } = req.body.workData;

    // Validate required fields
    if (!date || !title) {
      return res.status(400).json({ 
        message: "Date and title are required" 
      });
    }

    // Parse the date and create date range for the entire day
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all eligible members for common work
    const allEligibleMembers = await getActiveMemberIdsForCommonWork();
    
    // Calculate attendance statistics
    const totalExpectedMembers = allEligibleMembers.length;
    const totalAbsentMembers = absentArray ? absentArray.length : 0;
    const totalPresentMembers = totalExpectedMembers - totalAbsentMembers;

    // Get fine settings for common work
    const fineSettings = await getFineSettings();
    const commonWorkFineAmount = fineSettings.commonWorkFine || 500; // Default 500 if not found
    const totalFineAmount = totalAbsentMembers * commonWorkFineAmount;

    // Check if common work already exists for this date
    const existingWork = await CommonWork.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    let workId;
    let isUpdate = false;
    let finesAdded = 0;
    let finesRemoved = 0;
    
    if (existingWork) {
      // Update existing common work
      const previousAbsents = existingWork.absents || [];
      const newAbsents = absentArray || [];
      
      // Calculate fines to add and remove
      const absentsMembersToAdd = newAbsents.filter(id => !previousAbsents.includes(id));
      const absentsMembersToRemove = previousAbsents.filter(id => !newAbsents.includes(id));
      
      // Add fines for new absents
      for (const memberId of absentsMembersToAdd) {
        await Member.findOneAndUpdate(
          { member_id: memberId },
          {
            $push: {
              fines: {
                eventId: existingWork._id,
                eventType: "common-work",
                amount: commonWorkFineAmount,
              }
            }
          }
        );
        finesAdded++;
      }
      
      // Remove fines for members no longer absent
      for (const memberId of absentsMembersToRemove) {
        await Member.findOneAndUpdate(
          { member_id: memberId },
          {
            $pull: {
              fines: {
                eventId: existingWork._id,
                eventType: "common-work"
              }
            }
          }
        );
        finesRemoved++;
      }
      
      existingWork.title = title;
      existingWork.remarks = remarks || "";
      existingWork.absents = newAbsents;
      existingWork.totalExpectedMembers = totalExpectedMembers;
      existingWork.totalPresentMembers = totalPresentMembers;
      existingWork.totalFineAmount = totalFineAmount;
      
      await existingWork.save();
      workId = existingWork._id;
      isUpdate = true;
      
    } else {
      // Create new common work
      const newCommonWork = new CommonWork({
        date: selectedDate,
        title,
        remarks: remarks || "",
        absents: absentArray || [],
        totalExpectedMembers,
        totalPresentMembers,
        totalFineAmount,
      });
      
      const savedWork = await newCommonWork.save();
      workId = savedWork._id;
      
      // Add fines for all absent members
      for (const memberId of (absentArray || [])) {
        await Member.findOneAndUpdate(
          { member_id: memberId },
          {
            $push: {
              fines: {
                eventId: savedWork._id,
                eventType: "common-work",
                amount: commonWorkFineAmount,
              }
            }
          }
        );
        finesAdded++;
      }
    }

    res.status(200).json({ 
      message: isUpdate ? "Common work attendance updated successfully." : "Common work attendance saved successfully.",
      isUpdate,
      workId,
      finesAdded,
      finesRemoved,
      stats: {
        totalExpectedMembers,
        totalPresentMembers,
        totalAbsentMembers,
        attendanceRate: ((totalPresentMembers / totalExpectedMembers) * 100).toFixed(1),
        fineAmount: commonWorkFineAmount,
        totalFineAmount
      }
    });
  } catch (error) {
    console.error("Error saving common work attendance:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Delete common work
exports.deleteCommonWork = async (req, res) => {
  try {
    const { workId } = req.params;
    
    const deletedWork = await CommonWork.findByIdAndDelete(workId);
    
    if (!deletedWork) {
      return res.status(404).json({ message: "Common work not found" });
    }
    
    res.status(200).json({
      message: "Common work deleted successfully",
      deletedWork
    });
  } catch (error) {
    console.error("Error deleting common work:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get common work statistics
exports.getCommonWorkStats = async (req, res) => {
  try {
    const { year, workType } = req.query;
    const currentYear = year || new Date().getFullYear();
    
    const matchStage = {
      date: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    };
    
    if (workType && workType !== 'all') {
      matchStage.workType = workType;
    }
    
    const stats = await CommonWork.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalWorks: { $sum: 1 },
          totalExpectedAttendance: { $sum: "$totalExpectedMembers" },
          totalActualAttendance: { $sum: "$totalPresentMembers" },
          avgAttendanceRate: { $avg: { $divide: ["$totalPresentMembers", "$totalExpectedMembers"] } },
          worksByType: {
            $push: {
              workType: "$workType",
              date: "$date",
              attendanceRate: { $divide: ["$totalPresentMembers", "$totalExpectedMembers"] }
            }
          }
        }
      }
    ]);
    
    const workTypeStats = await CommonWork.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$workType",
          count: { $sum: 1 },
          avgAttendance: { $avg: { $divide: ["$totalPresentMembers", "$totalExpectedMembers"] } }
        }
      }
    ]);
    
    res.status(200).json({
      message: "Common work statistics fetched successfully",
      stats: stats[0] || {
        totalWorks: 0,
        totalExpectedAttendance: 0,
        totalActualAttendance: 0,
        avgAttendanceRate: 0,
        worksByType: []
      },
      workTypeStats
    });
  } catch (error) {
    console.error("Error fetching common work statistics:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get actual fine amount for a common work from member documents
exports.getCommonWorkFineAmount = async (req, res) => {
  try {
    const { workId } = req.params;
    
    if (!workId) {
      return res.status(400).json({ message: "Common work ID is required." });
    }
    
    console.log(`[getCommonWorkFineAmount] Getting fine amount for workId: ${workId}`);
    
    // First, get the common work document to find absent members
    const commonWork = await CommonWork.findById(workId);
    
    if (!commonWork) {
      return res.status(404).json({ message: "Common work not found." });
    }
    
    console.log(`[getCommonWorkFineAmount] Common work found. Absents: ${commonWork.absents?.length || 0}`);
    
    let commonWorkFine = null;
    
    // Get fine amount from the first absent member
    if (commonWork.absents && commonWork.absents.length > 0) {
      const firstAbsentMemberId = commonWork.absents[0];
      console.log(`[getCommonWorkFineAmount] Looking for common-work fine in member: ${firstAbsentMemberId}`);
      
      const member = await Member.findOne({ member_id: firstAbsentMemberId }).select('fines');
      
      if (member && member.fines) {
        const fine = member.fines.find(f => 
          f.eventId && f.eventId.toString() === workId.toString() && 
          f.eventType === 'common-work'
        );
        
        if (fine) {
          commonWorkFine = fine.amount;
          console.log(`[getCommonWorkFineAmount] ✓ Found common-work fine: ${commonWorkFine} for member ${firstAbsentMemberId}`);
        } else {
          console.log(`[getCommonWorkFineAmount] ✗ No common-work fine found for member ${firstAbsentMemberId}`);
        }
      }
    }
    
    // If no fine found (no one was absent), use current settings as default
    if (commonWorkFine === null) {
      console.log(`[getCommonWorkFineAmount] Using current system settings for fine amount.`);
      const fineSettings = await getFineSettings();
      commonWorkFine = fineSettings.commonWorkFine;
    }
    
    console.log(`[getCommonWorkFineAmount] Final amount - commonWorkFine: ${commonWorkFine}`);
    
    res.status(200).json({
      success: true,
      fineAmount: commonWorkFine
    });
  } catch (error) {
    console.error("Error fetching common work fine amount:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
