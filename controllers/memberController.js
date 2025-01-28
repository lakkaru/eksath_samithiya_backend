// const mongoose = require("mongoose");

// Import required modules
const jwt = require("jsonwebtoken"); // For decoding and verifying JWT tokens
const bcrypt = require("bcrypt");
const Member = require("../models/Member"); // Import the Member model
const Dependent = require("../models/Dependent");
const MembershipPayment = require("../models/MembershipPayment");
const FinePayment = require("../models/FinePayment");

// Environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// Get profile information for a member
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
    // console.log("decoded.member_id: ", decoded.member_id);
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
    const { password, email, mobile, whatsApp, address } = req.body;

    // Retrieve member ID from the decoded JWT token (set in the authMiddleware)
    const memberId = req.member.member_id; // Access member ID from req.member

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
    if (whatsApp) updateData.whatsApp = whatsApp;
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
    res
      .status(500)
      .json({ message: "Failed to update profile. Please try again later." });
  }
};

// Get data for member home page
exports.getMember = async (req, res) => {
  // console.log('test:', req.member)
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Extract "Bearer <token>"
    if (!token) {
      return res.status(401).json({ error: "Authorization token is missing" });
    }

    // Step 2: Verify and decode the token
    let decoded;
    decoded = jwt.verify(token, JWT_SECRET);
    const memberId = decoded.member_id;
    // console.log("memberId: ", memberId);
    if (!memberId) {
      return res
        .status(400)
        .json({ error: "Member ID is required in headers." });
    }

    // Find member by ID
    const member = await Member.findOne({ member_id: memberId }).populate(
      "dependents",
      "name"
    );

    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    // Calculate fineTotal by summing up amounts in the fines array
    const fineTotal = member.fines?.reduce(
      (total, fine) => total + fine.amount,
      0
    );
    // console.log(member._id);
    //getting all membership payments done by member
    const allMembershipPayments = await MembershipPayment.find({
      memberId: member._id,
    });
    //calculating membership payment due for this year
    //getting membership payments for this year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const membershipPayments = await MembershipPayment.find({
      memberId: member._id,
      date: {
        $gte: startOfYear,
        $lt: endOfYear,
      },
    }).select("date amount");
    //getting total membership payments for this year
    const totalMembershipPayments = membershipPayments.reduce(
      (total, payment) => total + payment.amount,
      0 // Initial value for the total
    );
    //calculating membership due for this year
    const currentMonth = new Date().getMonth() + 1;
    if (member.siblingsCount > 0) {
      membershipCharge =
        (300 * member.siblingsCount * 0.3 + 300) * currentMonth;
    } else {
      membershipCharge = 300 * currentMonth;
    }
    const membershipDue = membershipCharge - totalMembershipPayments;
    // console.log("membershipPayments:", membershipPayments);
    // Respond with member details
    // console.log('member:', member)
    res.status(200).json({
      area: member.area,
      address: member.address,
      mobile: member.mobile,
      whatsApp: member.whatsApp,
      email: member.email,
      previousDue: member.previousDue,
      meetingAbsents: member.meetingAbsents,
      dependents: member.dependents.map((dependent) => dependent.name),
      fineTotal, // Use the calculated fineTotal
      membershipDue: membershipDue,
    });
  } catch (error) {
    console.error("Error fetching member data:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get basic data of the member
exports.getMemberById = async (req, res) => {
  const { memberId } = req.params;
  // console.log(memberId)
  try {
    // Extract member_id from headers
    // const memberId = req.member.member_id;
    // console.log("memberId: ", memberId);
    if (!memberId) {
      return res
        .status(400)
        .json({ error: "Member ID is required in headers." });
    }

    // Find member by ID
    const member = await Member.findOne({ member_id: memberId }).select(
      "_id name mobile whatsApp area member_id"
    );

    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    // Respond with member details
    res.status(200).json({
      member,
    });
  } catch (error) {
    console.error("Error fetching member data:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get payments data for member payments page
exports.getPayments = async (req, res) => {
  // console.log("getPayments");
  try {
    // Getting the authorization token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization token is missing" });
    }

    // Decode the token to extract member information
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const memberId = decoded.member_id;
    // console.log("Decoded Member ID:", memberId);
    //get member id object

    const member_Id = await Member.findOne({ member_id: memberId }).select(
      "_id"
    );
    // console.log('member_Id:', member_Id)
    // Fetch membership payments
    const membershipPayments = await MembershipPayment.find({
      memberId: member_Id, //id object
    }).select("date amount _id");
    // Combine and group payments by date
    const paymentMap = {};

    membershipPayments.forEach((payment) => {
      const date = new Date(payment.date).toISOString().split("T")[0]; // Normalize date
      if (!paymentMap[date]) {
        paymentMap[date] = {
          date,
          mem_id: null,
          memAmount: 0,
          fine_id: null,
          fineAmount: 0,
        };
      }
      paymentMap[date].mem_id = payment._id;
      paymentMap[date].memAmount += payment.amount || 0;
    });

    // Fetch fine payments
    const finePayments = await FinePayment.find({
      memberId: member_Id, //id object
    }).select("date amount _id");
    // console.log('member_Id:', member_Id)
    // console.log('finePayments:', finePayments)
    finePayments.forEach((payment) => {
      const date = new Date(payment.date).toISOString().split("T")[0]; // Normalize date
      if (!paymentMap[date]) {
        paymentMap[date] = {
          date,
          mem_id: null,
          memAmount: 0,
          fine_id: null,
          fineAmount: 0,
        };
      }
      paymentMap[date].fine_id = payment._id;
      paymentMap[date].fineAmount += payment.amount || 0;
    });

    // Convert the map to an array and sort by date
    const allPayments = Object.values(paymentMap).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    //Process and group payments
    const formattedPayments = allPayments.map((payment) => ({
      ...payment,
      date:
        payment.date !== "Total"
          ? new Date(payment.date)
              .toISOString()
              .split("T")[0]
              .replace(/-/g, "/")
          : "Total",
    }));
    const grouped = formattedPayments.reduce((acc, payment) => {
      if (payment.date === "Total") return acc; // Skip the global total row
      const year = payment.date.split("/")[0]; // Extract the year
      if (!acc[year]) {
        acc[year] = {
          payments: [],
          totals: { memAmount: 0, fineAmount: 0 },
        };
      }

      acc[year].payments.push(payment);

      acc[year].totals.memAmount += payment.memAmount || 0;
      acc[year].totals.fineAmount += payment.fineAmount || 0;

      return acc;
    }, {});

    // Add totals to each year's group
    Object.keys(grouped).forEach((year) => {
      grouped[year].payments.push({
        date: "Total",
        memAmount: grouped[year].totals.memAmount,
        fineAmount: grouped[year].totals.fineAmount,
      });
    });
    // const fineTotalAmount = allPayments.reduce(
    //   (sum, payment) => sum + payment.fineAmount,
    //   0
    // );
    // console.log("Previous Due:", member.previousDue.totalDue);

    // Send the response with the previous due
    res.status(200).json({
      message: "Payments fetched successfully",

      payments: grouped,
    });
  } catch (error) {
    console.error("Error in getPayments:", error.message);
    res.status(500).json({
      error: "An error occurred while fetching payment data",
      message: error.message,
    });
  }
};

//get data of the member for account receipt page
exports.getMemberDueById = async (req, res) => {
  const { member_id } = req.query;
  // console.log(member_id)
  try {
    // Extract member_id from headers
    // const memberId = req.member.member_id;
    // console.log("memberId: ", memberId);
    if (!member_id) {
      return res
        .status(400)
        .json({ error: "Member ID is required in headers." });
    }

    // Find member by ID
    const member = await Member.findOne({ member_id: member_id }).select(
      "_id member_id name previousDue fines"
    );
    // console.log(member)
    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    // Calculate fineTotal by summing up amounts in the fines array
    const fineTotal = member.fines?.reduce(
      (total, fine) => total + fine.amount,
      0
    );
    //getting total of fins and previous dues
    const totalDue = fineTotal + member.previousDue.totalDue;
    // //getting all membership payments done by member
    // const allMembershipPayments = await MembershipPayment.find({
    //   memberId: member._id,
    // });
    //calculating membership payment due for this year
    //getting membership payments for this year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const membershipPayments = await MembershipPayment.find({
      memberId: member._id,
      date: {
        $gte: startOfYear,
        $lt: endOfYear,
      },
    }).select("date amount");
    //getting total membership payments for this year
    const totalMembershipPayments = membershipPayments.reduce(
      (total, payment) => total + payment.amount,
      0 // Initial value for the total
    );
    //calculating membership due for this year
    const currentMonth = new Date().getMonth() + 1;
    if (member.siblingsCount > 0) {
      membershipCharge =
        (300 * member.siblingsCount * 0.3 + 300) * currentMonth;
    } else {
      membershipCharge = 300 * currentMonth;
    }
    const membershipDue = membershipCharge - totalMembershipPayments;
  

    // Respond with member details
    res.status(200).json({
      member,
      totalDue,
      membershipDue
    });
  } catch (error) {
    console.error("Error fetching member data:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
