// const mongoose = require("mongoose");

// Import required modules
const jwt = require("jsonwebtoken"); // For decoding and verifying JWT tokens
const bcrypt = require("bcrypt");
const Member = require("../models/Member"); // Import the Member model
const Dependent = require("../models/Dependent");

// Environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// Function to get profile information for a member
exports.getProfileInfo = async (req, res) => {
  // console.log("edit profile");
  try {
    // Step 1: Extract the token from the request headers
    const token = req.headers.authorization?.split(" ")[1]; // Extract "Bearer <token>"
    if (!token) {
      return res.status(401).json({ error: "Authorization token is missing" });
    }

    // Step 2: Verify and decode the token
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET); // Decode the token using the secret
      // console.log('decoded.member_id: ', decoded.member_id)
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Step 3: Use the decoded token to fetch the member's data
    const member = await Member.findOne(
      { member_id: decoded.member_id }, // Match the member ID from the token
      "mobile whatsApp email address" // Specify only the fields to be retrieved
    );
    // console.log("member:", member);
    // Step 4: Check if the member exists
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Step 5: Respond with the member's profile information
    return res.status(200).json({
      mobile: member.mobile,
      whatsApp: member.whatsApp,
      email: member.email,
      address: member.address,
    });
  } catch (error) {
    // Step 6: Handle server errors
    console.error("Error fetching member profile:", error);
    return res.status(500).json({
      error: "An error occurred while fetching the profile information",
    });
  }
};

// Update member profile
exports.updateProfileInfo = async (req, res) => {
  try {
    const { password, confirmPassword, email, mobile, whatsapp, address } = req.body;

    // Retrieve member ID from the decoded JWT token (set in the authMiddleware)
    const memberId = req.member.member_id;  // Access member ID from req.member

    if (!memberId) {
      return res.status(400).json({ message: "Member ID not found in token" });
    }

    // Prepare the updated data
    const updateData = {};

    // If password is provided, hash it before updating
    if (password) {
      const salt = await bcrypt.genSalt(10); // Create a salt
      updateData.password = await bcrypt.hash(password, salt); // Hash the password
    }
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;
    if (whatsapp) updateData.whatsApp = whatsapp;
    if (address) updateData.address = address;

    // Find and update the member in one operation
    const updatedMember = await Member.findOneAndUpdate(
      { member_id: memberId }, // Query condition
      { $set: updateData }, // Data to update
      { new: true } // Return the updated document
    );

    if (!updatedMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Respond with success
    res.status(200).json({ message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile. Please try again later." });
  }
};




// ---------------------------------------------------------------
// Get next member ID
exports.getNextId = async (req, res) => {
  try {
    // Find the member with the highest member_id
    const highestMember = await Member.findOne({})
      .sort({ member_id: -1 }) // Sort by member_id in descending order
      .select("member_id"); // Only select the member_id field

    // Determine the next member_id
    const nextMemberId = highestMember ? highestMember.member_id + 1 : 1;

    res.status(200).json({
      success: true,
      nextMemberId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting next memberId.",
      error: error.message,
    });
  }
};

// Create a new member and dependents
exports.createMember = async (req, res) => {
  // console.log(req.body);
  // return
  let newlyAddedMember = {};
  try {
    const {
      member_id,
      name,
      area,
      password,
      res_tel,
      mob_tel,
      address,
      email,
      nic,
      birthday,
    } = req.body;
    const { dependents } = req.body;
    // console.log('dependents: ', dependents)ok
    // Validate required fields
    if (!member_id || !area || !name) {
      return res.status(400).json({
        success: false,
        message: "Member ID, area, and name are required.",
      });
    }

    // Create and save the new member
    const newMember = new Member({
      member_id,
      name,
      area,
      password: member_id,
      res_tel,
      mob_tel,
      address,
      email,
      nic,
      birthday,
    });
    // console.log('newMember: ', newMember)
    // return
    await newMember
      .save()
      .then((member) => {
        newlyAddedMember = member;
        console.log("newlyAddedMember:", newlyAddedMember);
        // return
      })
      .catch((error) => {
        console.error("Error saving member:", error);
        return res.status(500).json({
          success: false,
          message: "Error saving member.",
          error: error.message,
        });
      });

    // Collect the IDs of saved dependents
    const dependentIds = [];

    // Create and save dependents
    if (dependents && dependents.length > 0) {
      for (const dependent of dependents) {
        if (dependent.name !== "") {
          const newDependent = new Dependent({
            name: dependent.name,
            relationship: dependent.relationship,
            nic: dependent.nic,
            birthday: dependent.birthday,
            member_id: newlyAddedMember._id, // Link dependent to the newly added member
          });

          await newDependent
            .save()
            .then((savedDependent) => {
              // console.log("Dependent saved successfully:", savedDependent);
              dependentIds.push(savedDependent._id); // Collect dependent IDs
            })
            .catch((error) => {
              console.error("Error saving dependent:", error);
              return res.status(500).json({
                success: false,
                message: "Error saving dependent.",
                error: error.message,
              });
            });
        }
      }
    }

    // Update the member document with the dependents' IDs
    newlyAddedMember.dependents = dependentIds;
    await newlyAddedMember
      .save()
      .then(() => {
        console.log("Member updated with dependents successfully.");
      })
      .catch((error) => {
        console.error("Error updating member with dependents:", error);
        return res.status(500).json({
          success: false,
          message: "Error updating member with dependents.",
          error: error.message,
        });
      });

    res.status(200).json({
      success: true,
      message: "Member and dependents created successfully.",
      member: newlyAddedMember,
    });
  } catch (error) {
    console.error("Error in createMember:", error);
    res.status(500).json({
      success: false,
      message: "Error creating member.",
      error: error.message,
    });
  }
};

// Retrieve all members who are not deactivated and not free or convenient members
exports.getAllActiveMembers = async (req, res) => {
  try {
    const members = await Member.find({
      $or: [
        { deactivated_at: { $exists: false } }, // No deactivatedDate field
        { deactivated_at: null }, // deactivatedDate is explicitly null
      ],
    })
      .select("-password")
      .sort("member_id"); // Excludes the password field
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching members.",
      error: error.message,
    });
  }
};

exports.getAllMembersBasicInfo = async (req, res) => {
  try {
    const membersBasicInfo = await Member.find().select(
      "name area member_id mob_tel res_tel "
    ); // Excludes the password field and include required
    res.status(200).json({ success: true, membersBasicInfo: membersBasicInfo });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching members.",
      error: error.message,
    });
  }
};

// Retrieve a single member by `member_id`
exports.getMemberById = async (req, res) => {
  // console.log(req.body)
  try {
    const { member_id } = req.query;
    // console.log(member_id);
    const member = await Member.findOne({ member_id: member_id }).select(
      "member_id name area mob_tel res_tel"
    ); // Find by `member_id`
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found." });
    }

    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching member.",
      error: error.message,
    });
  }
};

//get member death details

exports.getMembershipDeathById = async (req, res) => {
  try {
    const { member_id } = req.query;
    // console.log(member_id)
    // Find the member by member_id and populate dependents
    const member = await Member.findOne({ member_id })
      .populate("dependents", "name relationship dateOfDeath") // Populate dependents with necessary fields
      .select("_id member_id name dateOfDeath dependents area");

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Check for deceased dependents
    const deceasedDependents = member.dependents.filter(
      (dependent) => dependent.dateOfDeath
    );

    // If member or any dependent has `dateOfDeath`, return the information
    if (member.dateOfDeath || deceasedDependents.length > 0) {
      return res.status(200).json({
        message: "Deceased member or dependents retrieved",
        data: {
          member: {
            _id: member._id,
            member_id: member.member_id,
            name: member.name,
            area: member.area,
            mob_tel: member.mob_tel,
            res_tel: member.res_tel,
            dateOfDeath: member.dateOfDeath,
          },
          dependents: deceasedDependents, // Array of deceased dependents
        },
      });
    }

    // If no `dateOfDeath` for member or dependents, return an empty array
    return res.status(200).json({
      message: "No deceased member or dependents found",
      data: [],
    });
  } catch (error) {
    console.error("Error retrieving member and dependents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Get member full details by memberId
exports.getAllDataById = async (req, res) => {
  const { member_id } = req.query;
  console.log(member_id);
  try {
    // console.log('Get Dependents')

    const member = await Member.findOne({ member_id: member_id })
      .select("-password")
      .populate("dependents");
    // const member = await Member.findOne({ member_id: member_id });  // Populate dependents
    // console.log(member[0]._id)
    if (member) {
      // console.log(member)
      // console.log(member.dependents)
      // const dependents = await Dependent.find({
      //   member_id: member[0]._id,
      // }).select("name relationship");
      res
        .status(200)
        .json({ success: true, member: member, dependents: member.dependents });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching dependents.",
      error: error.message,
    });
  }
};

//get family register
exports.getFamilyRegisterById = async (req, res) => {
  const { member_id } = req.query;

  try {
    //     // Fetch the member details
    //     const member = await Member.findOne({ member_id: member_id }).select(
    //       "name _id dateOfDeath"
    //     ).populate('dependents');
    // // console.log(member)

    //     // If no member is found, return an appropriate error response
    //     if (!member ) {
    //       return res.status(404).json({
    //         success: false,
    //         message: "Member not found.",
    //       });
    //     }
    const member = await Member.findOne({ member_id: member_id })
      .select("name _id dateOfDeath")
      .populate("dependents");

    if (!member) {
      throw new Error("Member not found");
    }

    // Add "relationship": "member" to the member object
    const memberWithRelationship = {
      ...member.toObject(), // Convert Mongoose document to plain JS object
      relationship: "සාමාජික",
    };

    // // Create a new array with the member object and dependents
    // const dependentsWithRelationship = member.dependents.map((dependent) => ({
    //   ...dependent.toObject(),
    //   relationship: "dependent",
    // }));

    const FamilyRegister = [memberWithRelationship, ...member.dependents];

    // console.log(FamilyRegister);

    // Add "relationship: 'member'" to the first member object
    // member = { ...member, relationship: "සාමාජික" };
    // console.log(member)

    // Fetch dependents for the member
    // const dependents = await Dependent.find({
    //   member_id: member._id,
    // }).select("name relationship _id dateOfDeath");
    // const dependents=member._doc.dependents
    // Add the member to the beginning of the dependents array
    // dependents.unshift(member);

    // Return the response with member and dependents
    res.status(200).json({
      success: true,
      FamilyRegister,
    });
  } catch (error) {
    // Handle server errors
    res.status(500).json({
      success: false,
      message: "Error fetching member details.",
      error: error.message,
    });
  }
};

//Get area full details
exports.getMemberAllByArea = async (req, res) => {
  // console.log("first");
  const { area } = req.query; // Extract the query parameter
  // console.log(area); // Log the area to check the value

  try {
    const members = await Member.find({
      area: area, // Match the specific area
      $or: [
        { deactivated_at: { $exists: false } }, // No deactivatedDate field
        { deactivated_at: null }, // deactivatedDate is explicitly null
      ],
    })
      .select("member_id name area mob_tel res_tel")
      .sort("member_id");

    res.status(200).json({ success: true, members: members });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching members.",
      error: error.message,
    });
  }
};

//get all member ids for attendance chart
exports.getCurrentMemberIds = async (req, res) => {
  try {
    const members = await Member.find({
      $or: [
        { deactivated_at: { $exists: false } }, // No deactivatedDate field
        { deactivated_at: null }, // deactivatedDate is explicitly null
      ],
    })
      .select("member_id") // Select only the member_id field
      .sort("member_id"); // Sort by member_id

    const memberIds = members.map((member) => member.member_id);
    res.status(200).json({ success: true, memberIds: memberIds });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching members.",
      error: error.message,
    });
  }
};

//update the member date of death
exports.updateDiedStatus = async (req, res) => {
  const { _id, dateOfDeath } = req.body;
  // console.log(req.body)
  // Input validation
  // if (typeof member_id !== "number") {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Invalid or missing member_id. It must be a number.",
  //   });
  // }

  // Convert dateOfDeath to a Date object
  const parsedDateOfDeath = new Date(dateOfDeath);

  // Check if the conversion results in a valid Date object
  if (
    !(parsedDateOfDeath instanceof Date) ||
    isNaN(parsedDateOfDeath.getTime())
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing 'dateOfDeath'. It must be a valid Date object.",
    });
  }

  try {
    // Use Mongoose's `findOneAndUpdate` to update the died status
    const updatedMember = await Member.findOneAndUpdate(
      { _id }, // Filter condition
      { $set: { dateOfDeath } }, // Update the `died` field
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    // If no member is found, return a 404 error
    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // Respond with the updated member
    res.status(200).json({
      success: true,
      message: "Died status updated successfully.",
      member: updatedMember,
    });
  } catch (error) {
    // Handle any server or database errors
    res.status(500).json({
      success: false,
      message: "Error updating died status.",
      error: error.message,
    });
  }
};
//update the member previous due
exports.updatePreviousDue = async (req, res) => {
  const { member_id, previousDue } = req.body;
  // console.log(req.body)

  try {
    // Use Mongoose's `findOneAndUpdate` to update the died status
    const updatedMember = await Member.findOneAndUpdate(
      { member_id }, // Filter condition
      { $set: { previousDue } }, // Update the `died` field
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    // If no member is found, return a 404 error
    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // Respond with the updated member
    res.status(200).json({
      success: true,
      message: "Previous due updated successfully.",
      member: updatedMember,
    });
  } catch (error) {
    // Handle any server or database errors
    res.status(500).json({
      success: false,
      message: "Error updating Previous due.",
      error: error.message,
    });
  }
};

//update the Dependent death
exports.updateDependentDiedStatus = async (req, res) => {
  const { _id, dateOfDeath } = req.body;
  // console.log(req.body)
  // Input validation
  // if (typeof member_id !== "number") {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Invalid or missing member_id. It must be a number.",
  //   });
  // }

  // Convert dateOfDeath to a Date object
  const parsedDateOfDeath = new Date(dateOfDeath);

  // Check if the conversion results in a valid Date object
  if (
    !(parsedDateOfDeath instanceof Date) ||
    isNaN(parsedDateOfDeath.getTime())
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing 'dateOfDeath'. It must be a valid Date object.",
    });
  }

  try {
    // Use Mongoose's `findOneAndUpdate` to update the died status
    const updatedDependent = await Dependent.findOneAndUpdate(
      { _id }, // Filter condition
      { $set: { dateOfDeath } }, // Update the `died` field
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    // If no dependent is found, return a 404 error
    if (!updatedDependent) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // Respond with the updated dependent
    res.status(200).json({
      success: true,
      message: "Died status updated successfully.",
      dependent: updatedDependent,
    });
  } catch (error) {
    // Handle any server or database errors
    res.status(500).json({
      success: false,
      message: "Error updating died status.",
      error: error.message,
    });
  }
};

// Update member and dependents
exports.updateMember = async (req, res) => {
  try {
    const MemberNewData = req.body;
    const _id = MemberNewData._id;
    const NewDependents = MemberNewData.dependents;

    // Getting current data of the member
    const MemberExistingData = await Member.findById(_id);
    if (!MemberExistingData) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found." });
    }

    // Prepare new member data without dependents
    const NewMemberData = { ...MemberNewData };
    NewMemberData.dependents = MemberExistingData.dependents;

    // Update the member's data (excluding dependents)
    const member = await Member.findByIdAndUpdate(_id, NewMemberData, {
      new: true,
    });
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found during update." });
    }

    // Handle dependents update
    if (NewDependents && NewDependents.length > 0) {
      // First, delete the existing dependents for this member
      await Dependent.deleteMany({
        _id: { $in: MemberExistingData.dependents },
      });

      // Create and save new dependents
      const dependentIds = [];
      for (const dependent of NewDependents) {
        if (dependent.name !== "") {
          const newDependent = new Dependent({
            name: dependent.name,
            relationship: dependent.relationship,
            nic: dependent.nic,
            birthday: dependent.birthday,
          });

          const savedDependent = await newDependent.save();
          dependentIds.push(savedDependent._id); // Collect dependent ObjectId
        }
      }

      // Update the member's dependents list with new dependent IDs (only ObjectId)
      member.dependents = dependentIds;

      // Save the member with the updated dependents
      await member.save();
    }

    res.status(200).json({
      success: true,
      message: "Member and dependents updated successfully.",
      data: member,
    });
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({
      success: false,
      message: "Error updating member.",
      error: error.message,
    });
  }
};

// Delete a member
exports.deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findByIdAndDelete(id);
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Member deleted successfully." });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting member.",
      error: error.message,
    });
  }
};

// Function to update deactivatedDate for a member
//postman PUT:http://127.0.0.1:3001/api/member/267/deactivate
//body{  "deactivatedDate": "2024-12-25T16:00:00Z"}

exports.updateDeactivatedDate = async (req, res) => {
  try {
    const { memberId } = req.params; // Get memberId from the URL parameters
    const { deactivatedDate } = req.body; // Get deactivatedDate from the request body

    // Ensure deactivatedDate is provided, if not, use the current date
    const deactivationDate = deactivatedDate
      ? new Date(deactivatedDate)
      : new Date();

    // Update the member's deactivatedDate field
    const updatedMember = await Member.findOneAndUpdate(
      { member_id: memberId }, // Search by member_id
      { deactivated_at: deactivationDate }, // Set the new deactivatedDate
      { new: true } // Return the updated member document
    );

    // If the member is not found, return an error response
    if (!updatedMember) {
      return res.status(404).json({ message: "Member not found." });
    }

    // Send a success response with the updated member data
    return res.status(200).json({
      message: "Member deactivated successfully.",
      member: updatedMember,
    });
  } catch (error) {
    // Handle errors and send a response
    console.error("Error updating deactivatedDate:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Function to update deactivatedDate for a member
exports.updateMemberStatus = async (req, res) => {
  try {
    const { memberId } = req.params; // Get memberId from the URL parameters
    const { status } = req.body; // Get deactivatedDate from the request body

    // Ensure status is provided, if not, use regular
    const memberStatus = status ? status : "regular";

    // Update the member's regular field
    const updatedMember = await Member.findOneAndUpdate(
      { member_id: memberId }, // Search by member_id
      { status: memberStatus }, // Set the new deactivatedDate
      { new: true } // Return the updated member document
    );

    // If the member is not found, return an error response
    if (!updatedMember) {
      return res.status(404).json({ message: "Member not found." });
    }

    // Send a success response with the updated member data
    return res.status(200).json({
      message: "Member deactivated successfully.",
      member: updatedMember,
    });
  } catch (error) {
    // Handle errors and send a response
    console.error("Error updating deactivatedDate:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
