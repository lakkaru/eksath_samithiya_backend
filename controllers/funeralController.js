const jwt = require("jsonwebtoken"); // For decoding and verifying JWT tokens
const bcrypt = require("bcrypt");
const Funeral = require("../models/Funeral");
const Member = require("../models/Member");

//getLast cemetery Assignment member and removed members for next duty assignments
exports.getLastAssignmentInfo = async (req, res) => {
  // console.log('getLastAssignmentInfo')
  try {
    const lastAssignment = await Funeral.find().sort({ _id: -1 }).limit(1);
    // console.log(lastAssignment)
    const lastMember_id = lastAssignment[0].cemeteryAssignments[14].member_id;
    const removedMembers = lastAssignment[0].removedMembers;
    const removedMembers_ids = removedMembers.map((member) => member.member_id);
    // console.log(removedMembers_ids)
    // const lastMember=await Member.findOne({_id:lastMember_id}).select("member_id");
    res.status(200).json({ lastMember_id, removedMembers_ids });
  } catch (error) {
    console.error("Error getting last assignment:", error.message);
    res
      .status(500)
      .json({ message: "Error getting last assignment", error: error.message });
  }
};
//create a funeral event
exports.createFuneral = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    let {
      date,
      member_id,
      deceased_id,
      cemeteryAssignments,
      funeralAssignments,
      removedMembers,
    } = req.body;

    //   console.log("Extracted data:", { date, member_id, deceased_id, cemetery, funeral });
    // Assign member_id to deceased_id if deceased_id is "member"

    if (deceased_id === "member") {
      deceased_id = member_id;
    }

    const newFuneral = new Funeral({
      date,
      member_id,
      deceased_id,
      cemeteryAssignments,
      funeralAssignments,
      removedMembers,
    });

    console.log("New funeral object:", newFuneral);

    const savedFuneral = await newFuneral.save();

    res.status(201).json(savedFuneral);
  } catch (error) {
    console.error("Error creating funeral:", error.message);
    res
      .status(500)
      .json({ message: "Error creating funeral", error: error.message });
  }
};

//get funeral id by deceased id
exports.getFuneralByDeceasedId = async (req, res) => {
  try {
    //   console.log(req.query)
    const { deceased_id } = req.query;

    const funeral_id = await Funeral.findOne({
      deceased_id: deceased_id,
    }).select("_id"); // Find the funeral by deceased_id
    //   console.log(funeral_id)
    return res.status(200).json(funeral_id);
  } catch (error) {
    console.error("Error getting funeral by deceased_id:", error.message);
    res.status(500).json({
      message: "Error getting funeral by deceased_id",
      error: error.message,
    });
  }
};

// Update event absents
exports.updateFuneralAbsents = async (req, res) => {
  try {
    const fineAmount = 100;
    const { funeral_id, absentArray } = req.body.absentData;
    console.log(funeral_id, absentArray);
  //  return
    // Check if both funeral_id and absentArray are provided
    if (!funeral_id || !Array.isArray(absentArray)) {
      return res.status(400).json({ message: "Invalid request data." });
    }

    // Update the funeral document
    const updatedFuneral = await Funeral.findByIdAndUpdate(
      funeral_id,
      { eventAbsents: absentArray },
      { new: true } // Return the updated document
    );

    // Check if the document was found and updated
    if (!updatedFuneral) {
      return res.status(404).json({ message: "Funeral not found." });
    }
    // Create bulk updates for each absent member
    const bulkOperations = absentArray.map((memberId) => ({
      updateOne: {
        filter: { member_id: memberId },
        update: {
          $push: {
            fines: {
              eventId: funeral_id,
              eventType: "funerals",
              amount: fineAmount,
            },
          },
        },
      },
    }));
    // Execute the bulk write operation
    const result = await Member.bulkWrite(bulkOperations);
    console.log("Fines added successfully:", result);
    // Respond with the updated document
    res.status(200).json({
      message: "Funeral absents updated successfully.",
      funeral: updatedFuneral,
    });
  } catch (error) {
    console.error("Error updating funeral absents:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
