const Member = require("../models/Member");
const Loan = require("../models/Loan"); // Adjust the path to the Loan model if necessary
const LoanPrinciplePayment = require("../models/LoanPayment"); // Adjust the path to the Loan model if necessary
const LoanInterestPayment = require("../models/LoanInterestPayment"); // Adjust the path to the Loan model if necessary
const PenaltyIntPayment = require("../models/LoanPenaltyIntPayment"); // Adjust the path to the Loan model if necessary

//create a loan
exports.createLoan = async (req, res) => {
  const loanData = req.body;
  try {
    // console.log('loanData: ', loanData)
    // Ensure the loan number is unique
    const existingLoan = await Loan.findOne({
      loanNumber: loanData.loanNumber,
    });
    if (existingLoan) {
      return res.status(400).json({ message: "Loan number already exists" });
    }
    const newLoan = new Loan({ ...loanData });
    const savedLoan = await newLoan.save();
    res.status(201).json(savedLoan);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating loan", error: error.message });
  }
};

/*** Get all active loans and unpaid months*/
exports.getActiveLoans = async (req, res) => {
  try {
    const activeLoans = await Loan.find({
      loanRemainingAmount: { $gt: 0 },
    })
      .populate("memberId", "name member_id")
      .sort({ loanNumber: 1 });

    const activeLoansWithInterest = await Promise.all(
      activeLoans.map(async (loan) => {
        const lastInterestPayment = await LoanInterestPayment.findOne({
          loanId: loan._id,
        })
          .sort({ date: -1 })
          .exec();

        let unpaidDuration = null;

        if (lastInterestPayment) {
          const lastPaymentDate = new Date(lastInterestPayment.date);
          const currentDate = new Date();
          unpaidDuration = Math.ceil(
            (currentDate.getFullYear() - lastPaymentDate.getFullYear()) * 12 +
              currentDate.getMonth() -
              lastPaymentDate.getMonth()
          );
          // console.log("lastPaymentDate: ", lastPaymentDate);
          // console.log("currentDate: ", currentDate);
          // console.log("unpaidDuration: ", unpaidDuration);
        } else {
          const loanStartDate = new Date(loan.loanDate);
          const currentDate = new Date();
          unpaidDuration = Math.ceil(
            (currentDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
              currentDate.getMonth() -
              loanStartDate.getMonth()
          );
        }

        return {
          ...loan.toObject(),
          unpaidDuration,
        };
      })
    );

    res.status(200).json({
      success: true,
      activeLoans: activeLoansWithInterest,
    });
  } catch (error) {
    // console.error("Error fetching active loans:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active loans",
      error: error.message,
    });
  }
};

//getting all loan info of a member
exports.getMemberLoanInfo = async (req, res) => {
  const { member_id } = req.params;
  // console.log('member_id :', member_id)
  let member, loan;
  try {
    member = await Member.findOne({ member_id }).select("_id name area mobile");
    // console.log('member: ', member)
    if (member) {
      try {
        loan = await Loan.findOne({ memberId: member._id }).select(
          "_id loanRemainingAmount loanNumber"
        );
        // console.log('loan :', loan)
      } catch (error) {
        console.error("Error fetching loan:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching loan",
          error: error.message,
        });
      }
    }
    // Send the active loans as the response
    res.status(200).json({
      success: true,
      member,
      loan,
    });
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching member",
      error: error.message,
    });
  }
};

//get all payments of a member last loan for loan search
exports.getLoanOfMember = async (req, res) => {
  const { memberId } = req.params;
  // console.log(memberId)

  try {
    // -------------------------------------------------------------
    //calculating interest for loan according to payment date
    // const calculateInterest = (
    //   loanDate,
    //   remainingAmount,
    //   lastInterestPaymentDate,
    //   paymentDate
    // ) => {
    //   if (!loanDate || !remainingAmount || !paymentDate)
    //     return { int: 0, penInt: 0 };
    //   // console.log("paymentDate: ", paymentDate)
    //   const loanDateObj = new Date(loanDate);
    //   const lastIntPayDateObj = new Date(lastInterestPaymentDate || loanDate);
    //   const currentDate = new Date(paymentDate);
    //   // console.log("currentDate :", currentDate)
    //   const monthlyInterestRate = 0.03;
    //   const loanPeriodMonths = 10;

    //   let totalMonths =
    //     (currentDate.getFullYear() - loanDateObj.getFullYear()) * 12 +
    //     (currentDate.getMonth() - loanDateObj.getMonth());
    //   //adding one month if loan date is exceed
    //   if (currentDate.getDate() - loanDateObj.getDate() > 0) {
    //     totalMonths = totalMonths + 1;
    //   }
    //   //getting installment
    //   let loanInstallment = 0;
    //   // console.log('totalMonths:', totalMonths)
    //   // console.log('remainingAmount:', remainingAmount)
    //   if (totalMonths <= 10) {
    //     loanInstallment = totalMonths * 1000 - (10000 - remainingAmount);
    //     // console.log(loanInstallment)
    //   } else {
    //     loanInstallment = 10000 - remainingAmount;
    //     // console.log(loanInstallment)
    //   }

    //   // console.log("totalMonths :", totalMonths)
    //   let lastPaymentMonths =
    //     (lastIntPayDateObj.getFullYear() - loanDateObj.getFullYear()) * 12 +
    //     (lastIntPayDateObj.getMonth() - loanDateObj.getMonth());
    //   // //adding one month if loan date is exceed
    //   // if ((lastIntPayDateObj.getDate() - loanDateObj.getDate())>0) {
    //   //   lastPaymentMonths=lastPaymentMonths+1
    //   // }
    //   // console.log("lastPaymentMonths :", lastPaymentMonths)

    //   const interestUnpaidMonths = Math.max(totalMonths - lastPaymentMonths, 0);
    //   // console.log("interestUnpaidMonths: ", interestUnpaidMonths)
    //   let penaltyMonths = 0;
    //   //checking loan is over due
    //   if (totalMonths > 10) {
    //     //penalty months
    //     const dueMonths = totalMonths - loanPeriodMonths;
    //     //checking if int payment has done before due
    //     if (interestUnpaidMonths > dueMonths) {
    //       penaltyMonths = dueMonths;
    //     } else {
    //       penaltyMonths = interestUnpaidMonths;
    //     }
    //   }
    //   // console.log('penaltyMonths: ', penaltyMonths)
    //   const interest =
    //     remainingAmount * interestUnpaidMonths * monthlyInterestRate;
    //   const penaltyInterest =
    //     remainingAmount * penaltyMonths * monthlyInterestRate;
    //   return {
    //     int: Math.round(interest),
    //     penInt: Math.round(penaltyInterest),
    //     installment: Math.round(loanInstallment + interest + penaltyInterest),
    //   };
    // };
    // -------------------------------------------------------------

    const loan = await Loan.find({ memberId, loanRemainingAmount: { $gt: 0 } })
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
    if (loan) {
      principlePayments = await LoanPrinciplePayment.find({
        loanId: loan[0]?._id,
      }).select("date amount");
      interestPayments = await LoanInterestPayment.find({
        loanId: loan[0]?._id,
      }).select("date amount");
      penaltyIntPayments = await PenaltyIntPayment.find({
        loanId: loan[0]?._id,
      }).select("date amount");
      lastIntPaymentDate = await LoanInterestPayment.findOne({
        loanId: loan[0]?._id,
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

    // Send the grouped payments in the response
    res.status(200).json({
      success: true,
      loan: loan[0],
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
  // console.log("loanId: ", loanId);
  // console.log("amounts: ", amounts);
  // console.log("date: ", date);
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

    res.status(201).json({
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


