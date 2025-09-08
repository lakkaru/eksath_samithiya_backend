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
        await Member.findOneAndUpdate(
          { _id: member._id },
          {
            $push: {
              fines: {
                eventId: meetingId,
                eventType: "meeting",
                amount: FINE_AMOUNT,
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

async function absents() {
  const absents=Meeting.select('date absents')
}

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
      // Update existing meeting
      existingMeeting.absents = absentArray;
      await existingMeeting.save();
      meetingId = existingMeeting._id;
      
      // Remove all previous meeting-related fines for this meeting
      await Member.updateMany(
        {},
        {
          $pull: {
            fines: {
              eventId: meetingId,
              eventType: "meeting"
            }
          }
        }
      );
      
      // Reset all members' meetingAbsents to recalculate
      await Member.updateMany(
        {},
        { meetingAbsents: 0 }
      );
      
      // Recalculate all meeting absents from all meetings in chronological order
      const allMeetings = await Meeting.find().sort({ date: 1 });
      
      for (const meeting of allMeetings) {
        // Update meetingAbsents for absent members in this meeting
        if (meeting.absents && meeting.absents.length > 0) {
          await Promise.all(
            meeting.absents.map(async (member_id) => {
              try {
                await Member.findOneAndUpdate(
                  { member_id: member_id },
                  { $inc: { meetingAbsents: 1 } }
                );
              } catch (updateError) {
                console.error(`Error updating member ${member_id}:`, updateError);
              }
            })
          );
        }
      }
      
      // Reapply fines for all meetings
      for (const meeting of allMeetings) {
        if (meeting.absents && meeting.absents.length > 0) {
          const membersToCheck = await Member.find({
            member_id: { $in: meeting.absents }
          });
          
          for (const member of membersToCheck) {
            if (member.meetingAbsents > 0 && member.meetingAbsents % 3 === 0) {
              try {
                await Member.findOneAndUpdate(
                  { _id: member._id },
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
              } catch (fineError) {
                console.error(`Error applying fine to member ${member.member_id}:`, fineError);
              }
            }
          }
        }
      }
      
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