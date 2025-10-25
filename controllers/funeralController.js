const jwt = require("jsonwebtoken"); // For decoding and verifying JWT tokens
const bcrypt = require("bcrypt");
const Funeral = require("../models/Funeral");
const Member = require("../models/Member");
const { getFineSettings } = require('../utils/settingsHelper');
const { Admin } = require("../models/Admin");

//getLast cemetery Assignment member and removed members for next duty assignments
exports.getLastAssignmentInfo = async (req, res) => {
  try {
    const lastAssignment = await Funeral.find().sort({ _id: -1 }).limit(1);
    const lastMember_id = lastAssignment[0].cemeteryAssignments[14].member_id;
    const removedMembers = lastAssignment[0].removedMembers;
    const removedMembers_ids = removedMembers.map((member) => member.member_id);
    // const lastMember=await Member.findOne({_id:lastMember_id}).select("member_id");
    res.status(200).json({ lastMember_id, removedMembers_ids });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error getting last assignment", error: error.message });
  }
};
//create a funeral event
exports.createFuneral = async (req, res) => {
  try {
    let {
      date,
      member_id,
      deceased_id,
      cemeteryAssignments,
      funeralAssignments,
      removedMembers,
    } = req.body;

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

    const savedFuneral = await newFuneral.save();

    res.status(201).json(savedFuneral);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating funeral", error: error.message });
  }
};

//get funeral id by deceased id
exports.getFuneralByDeceasedId = async (req, res) => {
  try {
    const { deceased_id } = req.query;

    const funeral = await Funeral.findOne({
      deceased_id: deceased_id,
    }).select("_id"); // Find the funeral by deceased_id
    
    if (!funeral) {
      return res.status(404).json({
        message: "Funeral not found for the given deceased ID",
      });
    }
    
    return res.status(200).json(funeral._id.toString());
  } catch (error) {
    console.error("Error getting funeral by deceased_id:", error.message);
    res.status(500).json({
      message: "Error getting funeral by deceased_id",
      error: error.message,
    });
  }
};

// Update event absents with smart fine management
exports.updateFuneralAbsents = async (req, res) => {
  try {
    // Get fine amounts from database settings
    const fineSettings = await getFineSettings();
    const funeralAttendanceFine = fineSettings.funeralAttendanceFine;
    
    const { funeral_id, absentArray } = req.body.absentData;
    
    // Check if both funeral_id and absentArray are provided
    if (!funeral_id || !Array.isArray(absentArray)) {
      return res.status(400).json({ message: "Invalid request data." });
    }

    // Get current funeral to check previous absents and get deceased member's area
    const currentFuneral = await Funeral.findById(funeral_id).populate('member_id');
    if (!currentFuneral) {
      return res.status(404).json({ message: "Funeral not found." });
    }
    
    // Get the deceased member's area for area admin exclusion
    const deceasedMemberArea = currentFuneral.member_id?.area;

    const previousAbsents = currentFuneral.eventAbsents || [];
    const newAbsents = absentArray || [];
    
    // Find members who were previously absent but now present (remove fines)
    const nowPresent = previousAbsents.filter(memberId => !newAbsents.includes(memberId));
    
    // Find members who are newly absent (add fines)
    const newlyAbsent = newAbsents.filter(memberId => !previousAbsents.includes(memberId));

    // Get members who should be excluded from fines (assigned to work, removed, or have special status)
    // Extract member_id from assignment objects
    const cemeteryAssignedIds = (currentFuneral.cemeteryAssignments || []).map(assignment => assignment.member_id);
    const funeralAssignedIds = (currentFuneral.funeralAssignments || []).map(assignment => assignment.member_id);
    const removedMemberIds = (currentFuneral.removedMembers || []).map(member => member.member_id);
    
    // Get members with 'free' and 'attendance-free' status (they shouldn't get fines)
    const membersWithFreeStatus = await Member.find({
      member_id: { $in: newlyAbsent },
      status: { $in: ['free', 'attendance-free'] }
    }).select('member_id');
    const freeStatusMemberIds = membersWithFreeStatus.map(member => member.member_id);
    
    // Get officer member IDs from Admin collection to exclude from fines
    const adminStructure = await Admin.findOne({});
    const officerMemberIds = [];
    
    if (adminStructure) {
      // Extract member IDs from main admin roles (excluding auditor - they should be fined)
      if (adminStructure.chairman?.memberId) officerMemberIds.push(adminStructure.chairman.memberId);
      if (adminStructure.secretary?.memberId) officerMemberIds.push(adminStructure.secretary.memberId);
      if (adminStructure.viceChairman?.memberId) officerMemberIds.push(adminStructure.viceChairman.memberId);
      if (adminStructure.viceSecretary?.memberId) officerMemberIds.push(adminStructure.viceSecretary.memberId);
      if (adminStructure.treasurer?.memberId) officerMemberIds.push(adminStructure.treasurer.memberId);
      if (adminStructure.loanTreasurer?.memberId) officerMemberIds.push(adminStructure.loanTreasurer.memberId);
      // Note: auditor is removed from exclusion - they should be fined for funeral absence
      if (adminStructure.speakerHandler?.memberId) officerMemberIds.push(adminStructure.speakerHandler.memberId);
      
      // Extract member IDs from area admins (including helpers) - only for deceased member's area
      if (adminStructure.areaAdmins && deceasedMemberArea) {
        adminStructure.areaAdmins.forEach(areaAdmin => {
          // Only exclude area admin and helpers if they are from the same area as deceased member
          if (areaAdmin.area === deceasedMemberArea) {
            if (areaAdmin.memberId) officerMemberIds.push(areaAdmin.memberId);
            if (areaAdmin.helper1?.memberId) officerMemberIds.push(areaAdmin.helper1.memberId);
            if (areaAdmin.helper2?.memberId) officerMemberIds.push(areaAdmin.helper2.memberId);
          }
        });
      }
    }
    
    const excludedFromFines = [
      ...cemeteryAssignedIds,
      ...funeralAssignedIds,
      ...removedMemberIds,
      ...freeStatusMemberIds,
      ...officerMemberIds
    ];

    // Filter newly absent members to exclude those with assignments, who are removed, or have free status
    const newlyAbsentEligibleForFines = newlyAbsent.filter(memberId => 
      !excludedFromFines.includes(memberId)
    );

    // Remove fines for members who are now present
    if (nowPresent.length > 0) {
      const memberObjectIds = await Member.find({ member_id: { $in: nowPresent } }).select('_id');
      const objectIds = memberObjectIds.map(m => m._id);
      
      await Member.updateMany(
        { _id: { $in: objectIds } },
        { 
          $pull: { 
            fines: { 
              eventId: funeral_id,
              eventType: "funeral"
            }
          }
        }
      );
    }

    // Add fines for newly absent members (excluding those with assignments, removed, or already have fines for this funeral)
    if (newlyAbsentEligibleForFines.length > 0) {
      // Check which members already have ANY fine for this funeral (any eventType)
      const membersWithExistingFines = await Member.find({
        member_id: { $in: newlyAbsentEligibleForFines },
        'fines.eventId': funeral_id
      }).select('member_id');
      
      const membersWithExistingFineIds = membersWithExistingFines.map(member => member.member_id);
      
      // Only add fines to members who don't already have ANY fine for this funeral
      const membersToFine = newlyAbsentEligibleForFines.filter(memberId => 
        !membersWithExistingFineIds.includes(memberId)
      );
      
      if (membersToFine.length > 0) {
        const memberObjectIds = await Member.find({ member_id: { $in: membersToFine } }).select('_id');
        
        for (let memberObjId of memberObjectIds) {
          await Member.findByIdAndUpdate(
            memberObjId._id,
            {
              $push: {
                fines: {
                  eventId: funeral_id,
                  eventType: "funeral",
                  amount: funeralAttendanceFine
                }
              }
            }
          );
        }
      }
    }

    // Update the funeral document
    const updatedFuneral = await Funeral.findByIdAndUpdate(
      funeral_id,
      { eventAbsents: newAbsents },
      { new: true }
    );

    // Calculate final statistics
    const membersWithExistingFines = await Member.find({
      member_id: { $in: newlyAbsentEligibleForFines },
      'fines.eventId': funeral_id
    }).select('member_id');
    const existingFinesCount = membersWithExistingFines.length;
    const actualFinesAdded = Math.max(0, newlyAbsentEligibleForFines.length - existingFinesCount);
    
    // Respond with the updated document and fine information
    res.status(200).json({
      message: "Funeral attendance updated successfully.",
      funeral: updatedFuneral,
      finesAdded: actualFinesAdded,
      finesRemoved: nowPresent.length,
      excludedFromFines: newlyAbsent.length - newlyAbsentEligibleForFines.length,
      excludedDueToExistingFines: existingFinesCount
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get members with fines for a specific funeral
exports.getFuneralFines = async (req, res) => {
  try {
    const { funeral_id } = req.params;
    
    if (!funeral_id) {
      return res.status(400).json({ message: "Funeral ID is required" });
    }

    // Find all members who have funeral attendance fines for this funeral
    const membersWithFuneralFines = await Member.find({
      'fines.eventId': funeral_id,
      'fines.eventType': 'funeral'
    }).select('member_id name fines');

    // Extract funeral attendance fine details - only include members with non-zero fine amounts
    const finedMembers = membersWithFuneralFines
      .map(member => {
        const funeralFines = member.fines.filter(fine => 
          fine.eventId.toString() === funeral_id && fine.eventType === 'funeral'
        );
        
        return {
          member_id: member.member_id,
          name: member.name,
          fineAmount: funeralFines[0]?.amount || 0,
          fineCount: funeralFines.length
        };
      })
      .filter(member => member.fineAmount > 0);

    res.status(200).json({
      message: "Funeral attendance fines retrieved successfully",
      finedMembers: finedMembers,
      totalFinedMembers: finedMembers.length,
      totalFineAmount: finedMembers.reduce((sum, member) => sum + member.fineAmount, 0)
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving funeral fines", error: error.message });
  }
};

//update funeral extraDue fines
exports.updateMemberExtraDueFines = async (req, res) => {
  try {
    const dueData = req.body;
    if (!dueData) {
      return res.status(400).json({ message: "Invalid request data." });
    }
    //get member object id
    const member_Id = await Member.findOne({
      member_id: dueData.dueMemberId,
    }).select("_id");
    //het funeral object id
    const eventId = await Funeral.findOne({
      deceased_id: dueData.deceased_id,
    }).select("_id");
    //update funeral for extraDue members
    const updatedFuneral = await Funeral.findByIdAndUpdate(eventId, {
      $addToSet: { extraDueMembers: dueData.dueMemberId },
    });
    // Update fines of the member
    const updatedDue = await Member.findByIdAndUpdate(
      member_Id,
      {
        $push: {
          // Use MongoDB's $push to add a new fine to the array
          fines: {
            eventId: eventId,
            eventType: "extraDue",
            amount: dueData.amount,
          },
        },
      },
      { new: false } // Return the updated document
    );
    const { member_id, name, fines } = updatedDue;
    res.status(200).json({
      message: "Funeral extra due updated successfully.",
      updatedDue: { member_id, name, fines },
    });
  } catch (error) {
    console.error("Error updating extra due fines:", error);
  res.status(500).json({ message: "Internal server error." });
  }
};

//get Funeral Extra Due Members By DeceasedId
exports.getFuneralExDueMembersByDeceasedId = async (req, res) => {
  try {
    const { deceased_id } = req.query;

    // Find funeral details and select only extraDueMembers
    const { extraDueMembers, _id: funeralId } = await Funeral.findOne({
      deceased_id,
    }).select("_id extraDueMembers");

    if (!extraDueMembers) {
      return res.status(404).json({ message: "No funeral found." });
    }

    // Use Promise.all to resolve all member lookups
    const extraDueMembersInfo = await Promise.all(
      extraDueMembers.map(async (memberId) => {
        const extraDueMember = await Member.findOne({
          member_id: memberId,
        }).select("-_id member_id name fines");

        if (!extraDueMember) return null; // Handle case where the member is not found
        // Filter fines to only include those that match the eventId
        const filteredFines = extraDueMember.fines.filter(
          (fine) => fine.eventId.toString() === funeralId.toString()&& fine.eventType === "extraDue"
        );
        return {
          member_id: extraDueMember.member_id,
          name: extraDueMember.name,
          fines: filteredFines, // Only matching fines
        };
      })
    );
    // Remove any null values if some members were not found
    // const filteredExtraDueMembers = extraDueMembers.filter(
    //   (member) => member !== null
    // );
    //structured dues for a member on selected deceased
    const mappedExtraDues = extraDueMembersInfo.map((member) => {
      return member.fines.map((fine) => {
        return {
          memberId: member.member_id,
          name: member.name,
          extraDue: fine.amount,
          id:fine._id,
        };
      });
    });
    //getting all to an array
    const extraDueMembersPaidInfo = mappedExtraDues.flat();
    res.status(200).json({
      message: "Funeral extra due fetched successfully.",
      extraDueMembersPaidInfo: extraDueMembersPaidInfo.reverse(),
    });
  } catch (error) {
    console.error("Error fetching extra due members:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get available funerals for work attendance
exports.getAvailableFunerals = async (req, res) => {
  try {
    const funerals = await Funeral.find()
      .populate({
        path: "member_id",
        select: "name area member_id dependents",
        populate: {
          path: "dependents",
          select: "name relationship _id"
        }
      })
      .sort({ date: -1 })
      .limit(50);
    
    res.status(200).json({
      message: "Available funerals fetched successfully.",
      funerals: funerals
    });
  } catch (error) {
    console.error("Error fetching available funerals:", error);
    res.status(500).json({ 
      message: "Internal server error.",
      error: error.message 
    });
  }
};

// Get funeral by ID with full details
exports.getFuneralById = async (req, res) => {
  try {
    const { funeralId } = req.params;
    
    // Validate the funeralId parameter
    if (!funeralId || funeralId === 'undefined' || funeralId === 'null') {
      return res.status(400).json({ 
        message: "Invalid funeral ID provided." 
      });
    }
    
    const funeral = await Funeral.findById(funeralId)
      .populate({
        path: "member_id",
        select: "name area member_id dependents",
        populate: {
          path: "dependents",
          select: "name relationship _id"
        }
      });
    
    if (!funeral) {
      return res.status(404).json({ message: "Funeral not found." });
    }
    
    res.status(200).json({
      message: "Funeral details fetched successfully.",
      funeral: funeral
    });
  } catch (error) {
    console.error("Error fetching funeral details:", error);
    res.status(500).json({ 
      message: "Internal server error.",
      error: error.message 
    });
  }
};

// Update funeral work attendance
exports.updateWorkAttendance = async (req, res) => {
  try {
    const { funeralId, funeralWorkAbsents = [], cemeteryWorkAbsents = [] } = req.body;
    
    if (!funeralId) {
      return res.status(400).json({ message: "Funeral ID is required." });
    }
    
    const funeral = await Funeral.findById(funeralId);
    
    if (!funeral) {
      return res.status(404).json({ message: "Funeral not found." });
    }
    
    // Get previous absent members for both types
    const previousFuneralAbsents = funeral.funeralWorkAbsents || [];
    const previousCemeteryAbsents = funeral.cemeteryWorkAbsents || [];
    const newFuneralAbsents = funeralWorkAbsents || [];
    const newCemeteryAbsents = cemeteryWorkAbsents || [];
    
    // Find members who were previously absent but now present (remove fines)
    const funeralNowPresent = previousFuneralAbsents.filter(memberId => !newFuneralAbsents.includes(memberId));
    const cemeteryNowPresent = previousCemeteryAbsents.filter(memberId => !newCemeteryAbsents.includes(memberId));
    
    // Find members who are newly absent (add fines)
    const funeralNewlyAbsent = newFuneralAbsents.filter(memberId => !previousFuneralAbsents.includes(memberId));
    const cemeteryNewlyAbsent = newCemeteryAbsents.filter(memberId => !previousCemeteryAbsents.includes(memberId));
    
    // Get fine amounts from database settings
    const fineSettings = await getFineSettings();
    const funeralWorkFine = fineSettings.funeralWorkFine;
    const cemeteryWorkFine = fineSettings.cemeteryWorkFine;
    
    // Remove funeral work fines for members who are now present
    if (funeralNowPresent.length > 0) {
      const memberObjectIds = await Member.find({ member_id: { $in: funeralNowPresent } }).select('_id');
      const objectIds = memberObjectIds.map(m => m._id);
      
      await Member.updateMany(
        { _id: { $in: objectIds } },
        { 
          $pull: { 
            fines: { 
              eventId: funeralId,
              eventType: "funeral-work"
            }
          }
        }
      );
    }
    
    // Remove cemetery work fines for members who are now present
    if (cemeteryNowPresent.length > 0) {
      const memberObjectIds = await Member.find({ member_id: { $in: cemeteryNowPresent } }).select('_id');
      const objectIds = memberObjectIds.map(m => m._id);
      
      await Member.updateMany(
        { _id: { $in: objectIds } },
        { 
          $pull: { 
            fines: { 
              eventId: funeralId,
              eventType: "cemetery-work"
            }
          }
        }
      );
    }
    
    // Add funeral work fines for newly absent members
    if (funeralNewlyAbsent.length > 0) {
      const memberObjectIds = await Member.find({ member_id: { $in: funeralNewlyAbsent } }).select('_id');
      
      for (let memberObjId of memberObjectIds) {
        await Member.findByIdAndUpdate(
          memberObjId._id,
          {
            $push: {
              fines: {
                eventId: funeralId,
                eventType: "funeral-work",
                amount: funeralWorkFine
              }
            }
          }
        );
      }
    }
    
    // Add cemetery work fines for newly absent members
    if (cemeteryNewlyAbsent.length > 0) {
      const memberObjectIds = await Member.find({ member_id: { $in: cemeteryNewlyAbsent } }).select('_id');
      
      for (let memberObjId of memberObjectIds) {
        await Member.findByIdAndUpdate(
          memberObjId._id,
          {
            $push: {
              fines: {
                eventId: funeralId,
                eventType: "cemetery-work",
                amount: cemeteryWorkFine
              }
            }
          }
        );
      }
    }
    
    // Update separate absent arrays
    funeral.funeralWorkAbsents = newFuneralAbsents;
    funeral.cemeteryWorkAbsents = newCemeteryAbsents;
    
    // Update combined assignmentAbsents for backward compatibility
    const combinedAbsents = [...new Set([...newFuneralAbsents, ...newCemeteryAbsents])];
    funeral.assignmentAbsents = combinedAbsents;
    
    await funeral.save();
    
    res.status(200).json({
      message: "Funeral work attendance updated successfully.",
      funeral: funeral,
      funeralFinesAdded: funeralNewlyAbsent.length,
      funeralFinesRemoved: funeralNowPresent.length,
      cemeteryFinesAdded: cemeteryNewlyAbsent.length,
      cemeteryFinesRemoved: cemeteryNowPresent.length
    });
  } catch (error) {
    console.error("Error updating funeral work attendance:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get actual fine amounts for a funeral from member documents
exports.getFuneralWorkFineAmounts = async (req, res) => {
  try {
    const { funeralId } = req.params;
    
    if (!funeralId) {
      return res.status(400).json({ message: "Funeral ID is required." });
    }
    
    console.log(`[getFuneralWorkFineAmounts] Getting fine amounts for funeralId: ${funeralId}`);
    
    // First, get the funeral document to find absent members
    const funeral = await Funeral.findById(funeralId);
    
    if (!funeral) {
      return res.status(404).json({ message: "Funeral not found." });
    }
    
    console.log(`[getFuneralWorkFineAmounts] Funeral found. funeralWorkAbsents: ${funeral.funeralWorkAbsents?.length || 0}, cemeteryWorkAbsents: ${funeral.cemeteryWorkAbsents?.length || 0}`);
    
    let funeralWorkFine = null;
    let cemeteryWorkFine = null;
    
    // Get funeral work fine amount from the first absent member
    if (funeral.funeralWorkAbsents && funeral.funeralWorkAbsents.length > 0) {
      const firstAbsentMemberId = funeral.funeralWorkAbsents[0];
      console.log(`[getFuneralWorkFineAmounts] Looking for funeral-work fine in member: ${firstAbsentMemberId}`);
      
      const member = await Member.findOne({ member_id: firstAbsentMemberId }).select('fines');
      
      if (member && member.fines) {
        const fine = member.fines.find(f => 
          f.eventId && f.eventId.toString() === funeralId.toString() && 
          f.eventType === 'funeral-work'
        );
        
        if (fine) {
          funeralWorkFine = fine.amount;
          console.log(`[getFuneralWorkFineAmounts] ✓ Found funeral-work fine: ${funeralWorkFine} for member ${firstAbsentMemberId}`);
        } else {
          console.log(`[getFuneralWorkFineAmounts] ✗ No funeral-work fine found for member ${firstAbsentMemberId}`);
        }
      }
    }
    
    // Get cemetery work fine amount from the first absent member
    if (funeral.cemeteryWorkAbsents && funeral.cemeteryWorkAbsents.length > 0) {
      const firstAbsentMemberId = funeral.cemeteryWorkAbsents[0];
      console.log(`[getFuneralWorkFineAmounts] Looking for cemetery-work fine in member: ${firstAbsentMemberId}`);
      
      const member = await Member.findOne({ member_id: firstAbsentMemberId }).select('fines');
      
      if (member && member.fines) {
        const fine = member.fines.find(f => 
          f.eventId && f.eventId.toString() === funeralId.toString() && 
          f.eventType === 'cemetery-work'
        );
        
        if (fine) {
          cemeteryWorkFine = fine.amount;
          console.log(`[getFuneralWorkFineAmounts] ✓ Found cemetery-work fine: ${cemeteryWorkFine} for member ${firstAbsentMemberId}`);
        } else {
          console.log(`[getFuneralWorkFineAmounts] ✗ No cemetery-work fine found for member ${firstAbsentMemberId}`);
        }
      }
    }
    
    // If no fines found (no one was absent), use current settings as default
    if (funeralWorkFine === null || cemeteryWorkFine === null) {
      console.log(`[getFuneralWorkFineAmounts] Using current system settings for missing fine amounts.`);
      const fineSettings = await getFineSettings();
      funeralWorkFine = funeralWorkFine || fineSettings.funeralWorkFine;
      cemeteryWorkFine = cemeteryWorkFine || fineSettings.cemeteryWorkFine;
    }
    
    console.log(`[getFuneralWorkFineAmounts] Final amounts - funeralWorkFine: ${funeralWorkFine}, cemeteryWorkFine: ${cemeteryWorkFine}`);
    
    res.status(200).json({
      success: true,
      fineAmounts: {
        funeralWorkFine,
        cemeteryWorkFine
      }
    });
  } catch (error) {
    console.error("Error fetching funeral work fine amounts:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
