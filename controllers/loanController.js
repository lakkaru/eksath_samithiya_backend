const Loan = require("../models/Loan"); // Adjust the path to the Loan model if necessary
const LoanPrinciplePayment = require("../models/LoanPayment"); // Adjust the path to the Loan model if necessary
const LoanInterestPayment = require("../models/LoanInterestPayment"); // Adjust the path to the Loan model if necessary
const PenaltyIntPayment = require("../models/LoanPenaltyIntPayment"); // Adjust the path to the Loan model if necessary

/**
 * Get all active loans
 * @param {object} req - The request object
 * @param {object} res - The response object
 */
exports.getActiveLoans = async (req, res) => {
  try {
    // Find loans where loanRemainingAmount > 0
    const activeLoans = await Loan.find({
      loanRemainingAmount: { $gt: 0 },
    }).populate("memberId", "name member_id"); // Populate memberId with the name field (adjust as per your Member model)
    //   .populate("guarantor1Id", "name") // Populate guarantor1Id with the name field
    //   .populate("guarantor2Id", "name"); // Populate guarantor2Id with the name field

    // Send the active loans as the response
    res.status(200).json({
      success: true,
      activeLoans: activeLoans,
    });
  } catch (error) {
    console.error("Error fetching active loans:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active loans",
      error: error.message,
    });
  }
};

//get all payments of a member last loan for loan search
exports.getLoanOfMember = async (req, res) => {
  const { memberId } = req.params;
  // console.log(memberId)
  try {
    const loans = await Loan.find({ memberId })
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
    let principlePayments = [];
    let interestPayments = [];
    let penaltyIntPayments = [];
    let lastIntPaymentDate = "";
    if (loans) {
      principlePayments = await LoanPrinciplePayment.find({
        loanId: loans[0]._id,
      }).select("date amount");
      interestPayments = await LoanInterestPayment.find({
        loanId: loans[0]._id,
      }).select("date amount");
      penaltyIntPayments = await PenaltyIntPayment.find({
        loanId: loans[0]._id,
      }).select("date amount");
      lastIntPaymentDate = await LoanInterestPayment.findOne({
        loanId: loans[0]._id,
      })
        .sort({ date: -1 })
        .select("date");
    }
    // console.log(payments);

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

    // Send the grouped payments in the response
    res.status(200).json({
      success: true,
      loan: loans[0],
      groupedPayments,
      lastIntPaymentDate,
    });
  } catch (error) {
    console.error("Error fetching loan payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching loan payments",
      error: error.message,
    });
  }
};

// creating all payments for a loan
exports.createLoanPayments = async (req, res) => {
  const { loanId, amounts, date } = req.body;
  console.log("loanId: ", loanId);
  console.log("amounts: ", amounts);
  console.log("date: ", date);
  try {
    //creating new payments on loanPayments, loanInterestPayment, and loanPenaltyIntPayment
    const newPrinciplePayment = new LoanPrinciplePayment({
      loanId,
      amount: amounts.principle,
      date,
    });
    const newInterestPayment = new LoanInterestPayment({
      loanId,
      amount: amounts.interest,
      date,
    });
    const newPenaltyIntPayment = new PenaltyIntPayment({
      loanId,
      amount: amounts.penaltyInterest,
      date,
    });
    // console.log('newPayment  ' , newPayment)
    const savedPrinciplePayment = await newPrinciplePayment.save();
    const savedInterestPayment = await newInterestPayment.save();
    const savedPenaltyIntPayment = await newPenaltyIntPayment.save();

    //update loan remaining amount
    const updatedLoan = await Loan.findOneAndUpdate(
      { _id: loanId, loanRemainingAmount: { $gte: amounts.principle } }, // Ensure sufficient remaining amount
      { $inc: { loanRemainingAmount: -amounts.principle } }, // Reduce the remaining amount atomically
      { new: true, runValidators: true } // Return the updated document and apply validation
    );
    

    res
      .status(201)
      .json({
        message: "Payment recorded successfully.",
        data: {
          savedPrinciplePayment,
          savedInterestPayment,
          savedPenaltyIntPayment,
        },
      });
  } catch (error) {
    res.status(500).json({ message: "Error updating loan payments", error });
  }
};
