const Meeting = require("../models/Meeting");
const Member = require("../models/Member");

const FINE_AMOUNT = 500;



async function getActiveMemberIds() {
  const members = await Member.find({
    $or: [
      { deactivated_at: { $exists: false } }, // No deactivatedDate field
      { deactivated_at: null },
    ],
    status: { $nin: ["attendance-free", "free"] },
  })
    .select("member_id")
    .sort("member_id");

  return members.map((member) => member.member_id);
}

async function resetPresentMembers(presentArray) {
  if (!presentArray || presentArray.length === 0) return;

  await Promise.all(
    presentArray.map(async (member_id) => {
      try {
        await Member.findOneAndUpdate(
          { member_id: member_id, meetingAbsents: { $gt: 0 } },
          { meetingAbsents: 0 }
        );
      } catch (resetError) {
        console.error(`Error resetting member ${member_id}:`, resetError);
      }
    })
  );
}

async function updateMemberAbsents(absentArray) {
  return Promise.all(
    absentArray.map(async (member_id) => {
      try {
        const updatedMember = await Member.findOneAndUpdate(
          { member_id: member_id },
          { $inc: { meetingAbsents: 1 } },
          { new: true }
        );

        if (!updatedMember) {
          return null;
        }
        return updatedMember;
      } catch (updateError) {
        console.error(`Error updating member ${member_id}:`, updateError);
        return null;
      }
    })
  );
}

async function applyFines(updatedMembers, meetingId) {
  if (!updatedMembers || updatedMembers.length === 0) return;

  for (const member of updatedMembers) {
    if (member && member.meetingAbsents > 0 && member.meetingAbsents % 3 === 0) {
      try {
        // Ensure fines field is initialized as an array
        await Member.findOneAndUpdate(
          { _id: member._id, fines: { $exists: false } },
          { $set: { fines: [] } }
        );
        await Member.findOneAndUpdate(
          { _id: member._id, fines: null },
          { $set: { fines: [] } }
        );
        
        await Member.findOneAndUpdate(
          { _id: member._id },
          {
            $push: {
              fines: {
                eventId: meetingId,
                eventType: "meeting",
                amount: FINE_AMOUNT,
                date: new Date(),
              },
            },
          }
        );
      } catch (fineError) {
        console.error(`Error applying fine to member ${member.member_id}:`, fineError);
      }
    }
  }
}

// Efficient function to recalculate attendance and fines for specific members only
async function recalculateAttendanceForMembers(memberIds, currentMeetingId) {
  if (!memberIds || memberIds.length === 0) return;

  // Ensure affected members have proper fines arrays
  await Member.updateMany(
    { 
      member_id: { $in: memberIds },
      $or: [
        { fines: { $exists: false } },
        { fines: null },
        { fines: { $not: { $type: "array" } } }
      ]
    },
    { $set: { fines: [] } }
  );

  // Remove all meeting-related fines for affected members only
  await Member.updateMany(
    { 
      member_id: { $in: memberIds },
      fines: { $exists: true, $type: "array" } 
    },
    {
      $pull: {
        fines: {
          eventType: "meeting"
        }
      }
    }
  );

  // Reset meetingAbsents for affected members only
  await Member.updateMany(
    { member_id: { $in: memberIds } },
    { meetingAbsents: 0 }
  );

  // Get all meetings in chronological order
  const allMeetings = await Meeting.find().sort({ date: 1 });

  // Recalculate attendance for affected members only
  for (const meeting of allMeetings) {
    if (meeting.absents && meeting.absents.length > 0) {
      // Only process affected members who were absent in this meeting
      const affectedAbsentMembers = meeting.absents.filter(memberId => 
        memberIds.includes(memberId)
      );

      for (const member_id of affectedAbsentMembers) {
        try {
          // Increment meetingAbsents
          const updatedMember = await Member.findOneAndUpdate(
            { member_id: member_id },
            { $inc: { meetingAbsents: 1 } },
            { new: true }
          );

          // Apply fine if this member hits 3rd, 6th, 9th consecutive absence
          if (updatedMember && updatedMember.meetingAbsents > 0 && updatedMember.meetingAbsents % 3 === 0) {
            await Member.findOneAndUpdate(
              { _id: updatedMember._id },
              {
                $push: {
                  fines: {
                    eventId: meeting._id,
                    eventType: "meeting",
                    amount: FINE_AMOUNT,
                  },
                },
              }
            );
          }
        } catch (error) {
          console.error(`Error updating member ${member_id}:`, error);
        }
      }
    }

    // Reset meetingAbsents for affected members who were present in this meeting
    const affectedPresentMembers = memberIds.filter(memberId => 
      !meeting.absents.includes(memberId)
    );

    for (const member_id of affectedPresentMembers) {
      try {
        await Member.findOneAndUpdate(
          { member_id: member_id, meetingAbsents: { $gt: 0 } },
          { meetingAbsents: 0 }
        );
      } catch (error) {
        console.error(`Error resetting member ${member_id}:`, error);
      }
    }
  }
}

// Get members with fines for a specific meeting
exports.getMeetingFines = async (req, res) => {
  console.log('getMeetingFines called:', req.params)
  try {
    const { meeting_id } = req.params;
    
    if (!meeting_id) {
      return res.status(400).json({ message: "Meeting ID is required" });
    }

    // Find all members who have meeting fines for this meeting
    const membersWithMeetingFines = await Member.find({
      'fines.eventId': meeting_id,
      'fines.eventType': 'meeting'
    }).select('member_id name fines');

    console.log(`Found ${membersWithMeetingFines.length} members with meeting fines for meeting ${meeting_id}`)

    // Extract meeting fine details - show all fines for each member
    const finedMembers = membersWithMeetingFines
      .map(member => {
        const meetingFines = member.fines.filter(fine => 
          fine.eventId && fine.eventId.toString() === meeting_id && fine.eventType === 'meeting'
        );

        const processedFines = meetingFines.map((fine, index) => {
          return {
            amount: fine.amount || 0,
            date: fine.date || fine.createdAt || new Date(),
            _id: fine._id,
            eventId: fine.eventId,
            eventType: fine.eventType
          };
        });

        const totalFineAmount = meetingFines.reduce((sum, fine) => sum + (fine.amount || 0), 0);


        return {
          member_id: member.member_id,
          name: member.name,
          fines: processedFines,
          totalFineAmount: totalFineAmount,
          fineCount: meetingFines.length
        };
      });



    const finalFinedMembers = finedMembers.filter(member => member.totalFineAmount > 0);
    console.log(`After filtering: ${finalFinedMembers.length} members with fines remain`);


    
    res.status(200).json({
      message: "Meeting attendance fines retrieved successfully",
      finedMembers: finalFinedMembers,
      totalFinedMembers: finalFinedMembers.length,
      totalFineAmount: finalFinedMembers.reduce((sum, member) => sum + member.totalFineAmount, 0)
    });
  } catch (error) {
    console.error('Error in getMeetingFines:', error);
    res.status(500).json({ message: "Error retrieving meeting fines", error: error.message });
  }
};

//getting all meeting attendance 
exports.getAttendance = async (req, res) => {
  try {
    const memberIds = await getActiveMemberIds(); // Array of ObjectIds or strings
    const meetings = await Meeting.find()
      .select("date absents")
      .sort({ date: 1 });

    const attendanceRecords = meetings.map(meeting => {
      const attendance = memberIds.map(id => ({
        memberId: id,
        present: !meeting.absents.includes(id.toString()), // Assuming absents is array of strings
      }));

      return {
        date: meeting.date,
        attendance,
      };
    });

    res.status(200).json({
      message: "Attendance data fetched successfully",
      attendanceRecords,
      memberIds,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get meeting attendance by specific date
exports.getMeetingByDate = async (req, res) => {
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
    
    // Find meeting for the specified date
    const meeting = await Meeting.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).select("date absents _id");
    
    if (!meeting) {
      return res.status(200).json({ 
        message: "No meeting found for this date",
        meeting: null,
        absents: []
      });
    }
    
    res.status(200).json({
      message: "Meeting attendance fetched successfully",
      meeting: {
        _id: meeting._id,
        date: meeting.date,
        absents: meeting.absents || []
      }
    });
  } catch (error) {
    console.error("Error fetching meeting by date:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveAttendance = async (req, res) => {
  try {
    const { date, absentArray } = req.body.absentData;

    // Ensure all members have proper fines array initialized before any operations
    await Member.updateMany(
      { 
        $or: [
          { fines: { $exists: false } },
          { fines: null },
          { fines: { $not: { $type: "array" } } }
        ]
      },
      { $set: { fines: [] } }
    );

    // Parse the date and create date range for the entire day
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if meeting already exists for this date
    const existingMeeting = await Meeting.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    let meetingId;
    
    if (existingMeeting) {
      // Get the old absent array to determine which members' attendance changed
      const oldAbsentArray = existingMeeting.absents || [];
      
      // Update existing meeting
      existingMeeting.absents = absentArray;
      await existingMeeting.save();
      meetingId = existingMeeting._id;
      
      // Find members whose attendance status changed
      const newlyAbsent = absentArray.filter(id => !oldAbsentArray.includes(id));
      const newlyPresent = oldAbsentArray.filter(id => !absentArray.includes(id));
      const affectedMembers = [...new Set([...newlyAbsent, ...newlyPresent])];
      
      console.log(`Processing ${affectedMembers.length} affected members instead of all members`);
      
      if (affectedMembers.length === 0) {
        // No changes in attendance, return early
        return res.status(200).json({ 
          message: "No attendance changes detected.",
          isUpdate: true
        });
      }
      
      // Only process affected members - much more efficient
      await recalculateAttendanceForMembers(affectedMembers, meetingId);
      
    } else {
      // Create new meeting
      const newMeeting = new Meeting({
        date: selectedDate,
        absents: absentArray,
      });
      
      await newMeeting.save();
      meetingId = newMeeting._id;
      
      // Get all active member IDs
      const allActiveMembers = await getActiveMemberIds();

      // Create presentArray by removing absentArray from allActiveMembers
      const presentArray = allActiveMembers.filter(
        (memberId) => !absentArray.includes(memberId)
      );

      // Reset meetingAbsents for present members
      await resetPresentMembers(presentArray);

      // Update meetingAbsents for absent members
      const updatedMembers = await updateMemberAbsents(absentArray);

      // Apply fines based on meetingAbsents and meetingId
      await applyFines(updatedMembers, meetingId);
    }

    res.status(200).json({ 
      message: existingMeeting ? "Meeting attendance updated successfully." : "Attendance and meeting document created successfully.",
      isUpdate: !!existingMeeting
    });
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};