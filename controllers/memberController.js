// const mongoose = require("mongoose");

// Import required modules
const jwt = require("jsonwebtoken"); // For decoding and verifying JWT tokens
const bcrypt = require("bcrypt");
const Member = require("../models/Member"); // Import the Member model
const Dependant = require("../models/Dependent"); // Import the Member model
const Admin = require("../models/Admin");
const Loan = require("../models/Loan");
const LoanPrinciplePayment = require("../models/LoanPayment"); // Adjust the path to the Loan model if necessary
const LoanInterestPayment = require("../models/LoanInterestPayment"); // Adjust the path to the Loan model if necessary
const PenaltyIntPayment = require("../models/LoanPenaltyIntPayment");
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

//get member has loan
exports.getMemberHasLoanById = async (req, res) => {
  // console.log('has Loan')
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
    const member = await Member.findOne({ member_id: decoded.member_id });
    const loan = await Loan.findOne({
      memberId: member._id,
      loanRemainingAmount: { $gt: 0 },
    });
    if (loan) {
      return res.status(200).json({ loan: true });
    } else {
      return res.status(200).json({ loan: false });
    }
  } catch (error) {
    console.error("Error fetching member profile:", error);
    return res.status(500).json({
      error: "An error occurred while fetching the profile information",
    });
  }
};

//get my loan
exports.getMyLoan = async (req, res) => {
  // console.log("my Loan");
  //calculating interest for loan according to payment date
  const calculateInterest = (
    loanDate,
    remainingAmount,
    lastIntPaymentDate,
    paymentDate
  ) => {
    if (!loanDate || !remainingAmount || !paymentDate)
      return { int: 0, penInt: 0 };
    // console.log("paymentDate: ", paymentDate)
    // console.log("lastIntPaymentDate: ", lastIntPaymentDate)
    // console.log("loanDate: ", loanDate)
    const loanDateObj = new Date(loanDate);
    const lastIntPayDateObj = new Date(lastIntPaymentDate);
    const currentDate = new Date();
    // console.log("currentDate :", currentDate)
    // console.log("lastIntPayDateObj :", lastIntPayDateObj)
    // console.log("loanDateObj :", loanDateObj)
    const monthlyInterestRate = 0.03;
    const loanPeriodMonths = 10;

    let totalMonths =
      (currentDate.getFullYear() - loanDateObj.getFullYear()) * 12 +
      (currentDate.getMonth() - loanDateObj.getMonth());
    //adding one month if loan date is exceed
    if (currentDate.getDate() - loanDateObj.getDate() > 0) {
      totalMonths = totalMonths + 1;
    }
    //getting installment
    let loanInstallment = 0;
    // console.log('totalMonths:', totalMonths)
    // console.log('remainingAmount:', remainingAmount)
    if (totalMonths <= 10) {
      loanInstallment = totalMonths * 1000 - (10000 - remainingAmount);
      // console.log(loanInstallment)
    } else {
      loanInstallment = remainingAmount;
      // console.log(loanInstallment)
    }

    // console.log("totalMonths :", totalMonths)
    // console.log("lastIntPayDateObj :", lastIntPayDateObj);
    let lastPaymentMonths =
      (lastIntPayDateObj.getFullYear() - loanDateObj.getFullYear()) * 12 +
      (lastIntPayDateObj.getMonth() - loanDateObj.getMonth());
    // //adding one month if loan date is exceed
    // if ((lastIntPayDateObj.getDate() - loanDateObj.getDate())>0) {
    //   lastPaymentMonths=lastPaymentMonths+1
    // }
    // console.log("lastPaymentMonths :", lastPaymentMonths);

    const interestUnpaidMonths = Math.max(totalMonths - lastPaymentMonths, 0);
    // console.log("interestUnpaidMonths: ", interestUnpaidMonths)
    let penaltyMonths = 0;
    //checking loan is over due
    if (totalMonths > 10) {
      //penalty months
      const dueMonths = totalMonths - loanPeriodMonths;
      //checking if int payment has done before due
      if (interestUnpaidMonths > dueMonths) {
        penaltyMonths = dueMonths;
      } else {
        penaltyMonths = interestUnpaidMonths;
      }
    }
    // console.log('penaltyMonths: ', penaltyMonths)
    const interest =
      remainingAmount * interestUnpaidMonths * monthlyInterestRate;
    // console.log("interest: ", interest);
    const penaltyInterest =
      remainingAmount * penaltyMonths * monthlyInterestRate;
    return {
      int: Math.round(interest),
      penInt: Math.round(penaltyInterest),
      installment: Math.round(loanInstallment + interest + penaltyInterest),
    };
  };
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
    const member = await Member.findOne({ member_id: decoded.member_id });
    const loan = await Loan.findOne({
      memberId: member._id,
      loanRemainingAmount: { $gt: 0 },
    })
      .populate({
        path: "memberId",
        select: "member_id name mobile",
      })
      .populate({
        path: "guarantor1Id",
        select: "member_id name mobile",
      })
      .populate({
        path: "guarantor2Id",
        select: "member_id name mobile",
      });
    // console.log('loan: ', loan)
    let principlePayments = [];
    let interestPayments = [];
    let penaltyIntPayments = [];
    let lastIntPaymentDate = "";
    if (loan) {
      principlePayments = await LoanPrinciplePayment.find({
        loanId: loan?._id,
      }).select("date amount");
      interestPayments = await LoanInterestPayment.find({
        loanId: loan?._id,
      }).select("date amount");
      penaltyIntPayments = await PenaltyIntPayment.find({
        loanId: loan?._id,
      }).select("date amount");
      lastIntPaymentDate = await LoanInterestPayment.findOne({
        loanId: loan?._id,
      })
        .sort({ date: -1 })
        .select("date");

      // ------------------------------------------------------------------------------
      // const calculatedInterest = calculateInterest(
      //   loan[0]?.date,
      //   loan[0]?.loanRemainingAmount,
      //   lastInterestPaymentDate=lastIntPaymentDate,
      //   date
      // )
      // ------------------------------------------------------------------------------
      // Helper function to group payments by date
      const groupByDate = (payments) => {
        return payments.reduce((acc, payment) => {
          if (payment.date) {
            const date = new Date(payment.date).toISOString().split("T")[0]; // Format date as YYYY-MM-DD
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(payment);
          }
          return acc;
        }, {});
      };

      // Group payments by date
      const groupedPrinciplePayments = groupByDate(principlePayments);
      const groupedInterestPayments = groupByDate(interestPayments);
      const groupedPenaltyIntPayments = groupByDate(penaltyIntPayments);
      // console.log('groupedPenaltyIntPayments: ', groupedPenaltyIntPayments)

      // Combine grouped payments into an array of objects
      const allDates = new Set([
        ...Object.keys(groupedPrinciplePayments),
        ...Object.keys(groupedInterestPayments),
        ...Object.keys(groupedPenaltyIntPayments),
      ]);
      const groupedPayments = Array.from(allDates).map((date) => ({
        date,
        principleAmount:
          groupedPrinciplePayments[date]?.reduce(
            (sum, payment) => sum + payment.amount,
            0
          ) || 0,
        interestAmount:
          groupedInterestPayments[date]?.reduce(
            (sum, payment) => sum + payment.amount,
            0
          ) || 0,
        penaltyInterestAmount:
          groupedPenaltyIntPayments[date]?.reduce(
            (sum, payment) => sum + payment.amount,
            0
          ) || 0,
      }));
      // console.log("groupedPayments: ", groupedPayments);
      // console.log("loan: ", loan);

      const calculatedInterest = calculateInterest(
        loan?.loanDate,
        loan?.loanRemainingAmount,
        lastIntPaymentDate?.date,
        new Date()
      );
      // console.log("calculatedInterest: ", calculatedInterest);
      // Send the grouped payments in the response
      res.status(200).json({
        success: true,
        loan,
        groupedPayments,
        calculatedInterest,
      });
    } else {
      return res.status(200).json({ loan: false });
    }
  } catch (error) {
    console.error("Error fetching loan info:", error);
    return res.status(500).json({
      error: "An error occurred while fetching the member loan info",
    });
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
    const totalDue = fineTotal + member.previousDue;
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
      membershipDue,
    });
  } catch (error) {
    console.error("Error fetching member data:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get family
exports.getFamily = async (req, res) => {
  const { member_id } = req.params;
  // console.log('member_id: ', member_id)
  try {
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

    const FamilyRegister = [memberWithRelationship, ...member.dependents];

    // console.log(FamilyRegister);

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

//update the member date of death
exports.updateDiedStatus = async (req, res) => {
  const { _id, dateOfDeath } = req.body;
  // console.log(req.body)

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

//update the Dependent death
exports.updateDependentDiedStatus = async (req, res) => {
  const { _id, dateOfDeath } = req.body;
  console.log("dateOfDeath: ", dateOfDeath);
  // Input validation
  // if (typeof member_id !== "number") {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Invalid or missing member_id. It must be a number.",
  //   });
  // }

  // Convert dateOfDeath to a Date object
  // const parsedDateOfDeath = new Date(dateOfDeath);

  // // Check if the conversion results in a valid Date object
  // if (
  //   !(parsedDateOfDeath instanceof Date) ||
  //   isNaN(parsedDateOfDeath.getTime())
  // ) {
  //   return res.status(400).json({
  //     success: false,
  //     message:
  //       "Invalid or missing 'dateOfDeath'. It must be a valid Date object.",
  //   });
  // }

  try {
    // Use Mongoose's `findOneAndUpdate` to update the died status
    const updatedDependent = await Dependant.findOneAndUpdate(
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

// Retrieve all members who are active !(deactivated)
exports.getActiveMembers = async (req, res) => {
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

//get admins for funeral
exports.getAdminsForFuneral = async (req, res) => {
  try {
    const { area } = req.query;
    // console.log("area from create admins: ", area);
    // Generalize the area for matching
    const baseArea = area.replace(/\s*\d+$/, "").trim();

    const result = await Admin.findOne(
      { "areaAdmins.area": { $regex: `^${baseArea}`, $options: "i" } }, // Match the area admin
      {
        chairman: 1,
        secretary: 1,
        viceChairman: 1,
        viceSecretary: 1,
        treasurer: 1,
        loanTreasurer: 1,
        "areaAdmins.$": 1, // Return only the matching areaAdmin
      }
    ).lean();

    if (result) {
      // Collect all member IDs from main admins
      const memberIds = [
        result.chairman?.memberId,
        result.secretary?.memberId,
        result.viceChairman?.memberId,
        result.viceSecretary?.memberId,
        result.treasurer?.memberId,
        result.loanTreasurer?.memberId,
      ];

      // If an areaAdmin is found, add its memberId and helpers' memberIds
      if (result.areaAdmins && result.areaAdmins.length > 0) {
        const { memberId, helper1, helper2 } = result.areaAdmins[0];
        memberIds.push(memberId, helper1?.memberId, helper2?.memberId);
      }

      // Filter out null/undefined values
      const uniqueMemberIds = [...new Set(memberIds.filter(Boolean))].sort(
        (a, b) => a - b
      );

      res.status(200).json(uniqueMemberIds);
    } else {
      res.status(404).json({ message: "No matching data found." });
    }
  } catch (error) {
    console.error("Error getting Admin IDs:", error.message);
    res
      .status(500)
      .json({ message: "Error getting Admin IDs", error: error.message });
  }
};

//get membership death details
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

//get all member ids for funeral attendance chart
exports.getMemberIdsForFuneralAttendance = async (req, res) => {
  try {
    const members = await Member.find({
      $or: [
        { deactivated_at: { $exists: false } }, // No deactivatedDate field
        { deactivated_at: null },
      ],
      status: { $nin: ["attendance-free", "free"] },
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

// Get all member dues for meeting sign sheet
exports.getDueForMeetingSign = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() ; // Months are 0-based in JS

    // Get all active members
    const members = await Member.find({
      status: { $ne: "free" }, // Exclude members with status 'free'
      deactivated_at: null, // Exclude deactivated members
    }).select("_id member_id name previousDue fines").sort("member_id");

    // Get membership payments for the current year
    const payments = await MembershipPayment.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${currentYear}-01-01`), // Start of current year
            $lt: new Date(`${currentYear + 1}-01-01`), // Start of next year
          },
        },
      },
      {
        $group: {
          _id: "$memberId",
          totalPaid: { $sum: "$amount" },
        },
      },
    ]);

    // Convert payments to a map for quick lookup
    const paymentMap = new Map();
    payments.forEach((payment) => {
      paymentMap.set(payment._id.toString(), payment.totalPaid);
    });

    // Calculate total dues for each member
    const memberDues = members.map((member) => {
      const totalPaid = paymentMap.get(member._id.toString()) || 0;
      const membershipDue = currentMonth * 300 - totalPaid;
      const totalFines = member.fines.reduce(
        (sum, fine) => sum + fine.amount,
        0
      );
      const totalDue =
        (membershipDue) +
        member.previousDue +
        totalFines;

      return {
        member_id: member.member_id,
        // name: member.name,
        // membershipDue: membershipDue < 0 ? 0 : membershipDue,
        // previousDue: member.previousDue,
        // totalFines: totalFines,
        totalDue: totalDue, // Total amount due
      };
    });

    res.status(200).json(memberDues);
  } catch (error) {
    console.error("Error fetching total dues:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
