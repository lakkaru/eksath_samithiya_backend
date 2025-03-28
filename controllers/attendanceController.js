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
          console.log(`Member with ID ${member_id} not found.`);
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

exports.saveAttendance = async (req, res) => {
  try {
    const { date, absentArray } = req.body.absentData;

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

    // Create a new meeting document
    const newMeeting = new Meeting({
      date: date,
      absents: absentArray,
    });

    await newMeeting.save();

    // Apply fines based on meetingAbsents and meetingId
    await applyFines(updatedMembers, newMeeting._id);

    res.status(200).json({ message: "Attendance and meeting document created successfully." });
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};