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
      return res.status(400).json({ 
        success: false,
        message: "මෙම ණය අංකය දැනටමත් භාවිතයේ ඇත" 
      });
    }

    // Check if guarantors are already guarantors for other active loans (allow up to 2 loans per guarantor)
    if (loanData.guarantor1Id) {
      const existingGuarantor1Loans = await Loan.find({
        $or: [
          { guarantor1Id: loanData.guarantor1Id },
          { guarantor2Id: loanData.guarantor1Id }
        ],
        loanRemainingAmount: { $gt: 0 }, // Only check active loans
      });
      if (existingGuarantor1Loans.length >= 2) {
        return res.status(400).json({ 
          success: false,
          message: "පළමු ජාමිනුකරු දැනටමත් දෙකක් ණය සඳහා ජාමිනුකරුවෙකු වේ" 
        });
      }
    }

    if (loanData.guarantor2Id) {
      const existingGuarantor2Loans = await Loan.find({
        $or: [
          { guarantor1Id: loanData.guarantor2Id },
          { guarantor2Id: loanData.guarantor2Id }
        ],
        loanRemainingAmount: { $gt: 0 }, // Only check active loans
      });
      if (existingGuarantor2Loans.length >= 2) {
        return res.status(400).json({ 
          success: false,
          message: "දෙවන ජාමිනුකරු දැනටමත් දෙකක් ණය සඳහා ජාමිනුකරුවෙකු වේ" 
        });
      }
    }

    const newLoan = new Loan({ ...loanData });
    const savedLoan = await newLoan.save();
    res.status(201).json({
      success: true,
      message: "ණය සාර්ථකව සෑදීය",
      loan: savedLoan
    });
  } catch (error) {
    res
      .status(500)
      .json({ 
        success: false,
        message: "ණය නිර්මාණය කිරීමේදී දෝෂයක් සිදුවිය", 
        error: error.message 
      });
  }
};

/*** Get all active loans and unpaid months*/
exports.getActiveLoans = async (req, res) => {
  try {
    const activeLoans = await Loan.find({
      loanRemainingAmount: { $gt: 0 },
    })
      .populate("memberId", "name member_id")
      .populate("guarantor1Id", "name member_id")
      .populate("guarantor2Id", "name member_id")
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

// Get loan payments report within date range
exports.getLoanPaymentsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Fetch all payment types within the date range
    const [principalPayments, interestPayments, penaltyPayments] = await Promise.all([
      LoanPrinciplePayment.find({
        date: { $gte: start, $lte: end }
      }).populate({
        path: 'loanId',
        populate: {
          path: 'memberId',
          select: 'name member_id'
        }
      }).sort({ date: -1 }),
      
      LoanInterestPayment.find({
        date: { $gte: start, $lte: end }
      }).populate({
        path: 'loanId',
        populate: {
          path: 'memberId',
          select: 'name member_id'
        }
      }).sort({ date: -1 }),
      
      PenaltyIntPayment.find({
        date: { $gte: start, $lte: end }
      }).populate({
        path: 'loanId',
        populate: {
          path: 'memberId',
          select: 'name member_id'
        }
      }).sort({ date: -1 })
    ]);

    // Combine and organize payments by date and loan
    const paymentMap = new Map();

    // Add principal payments
    principalPayments.forEach(payment => {
      const key = `${payment.date.toDateString()}-${payment.loanId._id}`;
      if (!paymentMap.has(key)) {
        paymentMap.set(key, {
          _id: payment._id, // Add payment ID for edit/delete operations
          paymentDate: payment.date,
          loanId: payment.loanId,
          memberId: payment.loanId.memberId,
          principalAmount: 0,
          interestAmount: 0,
          penaltyInterestAmount: 0,
          amount: 0
        });
      }
      const paymentRecord = paymentMap.get(key);
      paymentRecord.principalAmount += payment.amount;
      paymentRecord.amount += payment.amount;
    });

    // Add interest payments
    interestPayments.forEach(payment => {
      const key = `${payment.date.toDateString()}-${payment.loanId._id}`;
      if (!paymentMap.has(key)) {
        paymentMap.set(key, {
          _id: payment._id, // Use interest payment ID if principal doesn't exist
          paymentDate: payment.date,
          loanId: payment.loanId,
          memberId: payment.loanId.memberId,
          principalAmount: 0,
          interestAmount: 0,
          penaltyInterestAmount: 0,
          amount: 0
        });
      }
      const paymentRecord = paymentMap.get(key);
      paymentRecord.interestAmount += payment.amount;
      paymentRecord.amount += payment.amount;
    });

    // Add penalty interest payments
    penaltyPayments.forEach(payment => {
      const key = `${payment.date.toDateString()}-${payment.loanId._id}`;
      if (!paymentMap.has(key)) {
        paymentMap.set(key, {
          _id: payment._id, // Use penalty payment ID if others don't exist
          paymentDate: payment.date,
          loanId: payment.loanId,
          memberId: payment.loanId.memberId,
          principalAmount: 0,
          interestAmount: 0,
          penaltyInterestAmount: 0,
          amount: 0
        });
      }
      const paymentRecord = paymentMap.get(key);
      paymentRecord.penaltyInterestAmount += payment.amount;
      paymentRecord.amount += payment.amount;
    });

    // Convert map to array and sort by date (newest first)
    const payments = Array.from(paymentMap.values()).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    res.status(200).json({
      success: true,
      payments,
      summary: {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        totalPrincipal: payments.reduce((sum, p) => sum + p.principalAmount, 0),
        totalInterest: payments.reduce((sum, p) => sum + p.interestAmount, 0),
        totalPenaltyInterest: payments.reduce((sum, p) => sum + p.penaltyInterestAmount, 0)
      }
    });

  } catch (error) {
    console.error("Error fetching loan payments report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching loan payments report",
      error: error.message
    });
  }
};

// Update loan payment
exports.updateLoanPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { principalAmount, interestAmount, penaltyInterestAmount, paymentDate, amount } = req.body;

    // Find the principal payment first
    const principalPayment = await LoanPrinciplePayment.findById(paymentId);
    
    if (!principalPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    const originalDate = principalPayment.date;
    const loanId = principalPayment.loanId;
    const newDate = new Date(paymentDate);

    // Update principal payment
    principalPayment.amount = principalAmount;
    principalPayment.date = newDate;
    await principalPayment.save();

    // Find and update interest payment using original date
    const interestPayment = await LoanInterestPayment.findOne({
      loanId: loanId,
      date: {
        $gte: new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate()),
        $lt: new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate() + 1)
      }
    });

    if (interestPayment) {
      interestPayment.amount = interestAmount;
      interestPayment.date = newDate;
      await interestPayment.save();
    }

    // Find and update penalty payment using original date
    const penaltyPayment = await PenaltyIntPayment.findOne({
      loanId: loanId,
      date: {
        $gte: new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate()),
        $lt: new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate() + 1)
      }
    });

    if (penaltyPayment) {
      penaltyPayment.amount = penaltyInterestAmount;
      penaltyPayment.date = newDate;
      await penaltyPayment.save();
    }

    res.status(200).json({
      success: true,
      message: "Payment updated successfully"
    });

  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment",
      error: error.message
    });
  }
};

// Delete loan payment
exports.deleteLoanPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Find the principal payment to get loan info
    const principalPayment = await LoanPrinciplePayment.findById(paymentId);
    
    if (!principalPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    const paymentDate = principalPayment.date;
    const loanId = principalPayment.loanId;
    const principalAmountToRestore = principalPayment.amount;

    // Delete all payment records for this date and loan
    await Promise.all([
      LoanPrinciplePayment.deleteOne({ _id: paymentId }),
      LoanInterestPayment.deleteOne({
        loanId: loanId,
        date: paymentDate
      }),
      PenaltyIntPayment.deleteOne({
        loanId: loanId,
        date: paymentDate
      })
    ]);

    // Restore the loan remaining amount
    await Loan.findByIdAndUpdate(
      loanId,
      { $inc: { loanRemainingAmount: principalAmountToRestore } }
    );

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting payment",
      error: error.message
    });
  }
};

// Update a loan - DISABLED (No editing allowed)
exports.updateLoan = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "ණය සංස්කරණය කිරීම අනුමත නොවේ"
  });
};

// Delete a loan
exports.deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the loan by ID
    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "ණය සොයා ගත නොහැක"
      });
    }

    // Check if loan was created today (same day restriction)
    const today = new Date();
    const loanDate = new Date(loan.loanDate);
    const isToday = today.toDateString() === loanDate.toDateString();

    if (!isToday) {
      return res.status(400).json({
        success: false,
        message: "අද දිනයේ එකතු කරන ලද ණය පමණක් ඉවත් කළ හැක"
      });
    }

    // Check if loan has any payments
    const hasPayments = await LoanPrinciplePayment.exists({ loanId: id }) ||
                        await LoanInterestPayment.exists({ loanId: id }) ||
                        await PenaltyIntPayment.exists({ loanId: id });

    if (hasPayments) {
      return res.status(400).json({
        success: false,
        message: "ගෙවීම් සහිත ණය ඉවත් කළ නොහැක. කරුණාකර මුලින් සියලුම ගෙවීම් ඉවත් කරන්න."
      });
    }

    // Delete the loan
    await Loan.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "ණය සාර්ථකව ඉවත් කරන ලදී"
    });
  } catch (error) {
    console.error("Error deleting loan:", error);
    res.status(500).json({
      success: false,
      message: "ණය ඉවත් කිරීමේදී දෝෂයක් සිදුවිය",
      error: error.message
    });
  }
};

// Get a single loan by ID
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    const loan = await Loan.findById(id).populate("memberId", "name member_id");
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "ණය සොයා ගත නොහැක"
      });
    }

    res.status(200).json({
      success: true,
      loan
    });
  } catch (error) {
    console.error("Error fetching loan:", error);
    res.status(500).json({
      success: false,
      message: "ණය ලබා ගැනීමේදී දෝෂයක් සිදුවිය",
      error: error.message
    });
  }
};

// Get next available loan number
exports.getNextLoanNumber = async (req, res) => {
  try {
    // Find the loan with the highest loan number
    const lastLoan = await Loan.findOne({})
      .sort({ loanNumber: -1 })
      .select('loanNumber');
    
    let nextLoanNumber = 1;
    
    if (lastLoan && lastLoan.loanNumber) {
      // Convert to number and increment
      const lastNumber = parseInt(lastLoan.loanNumber);
      if (!isNaN(lastNumber)) {
        nextLoanNumber = lastNumber + 1;
      }
    }

    res.status(200).json({
      success: true,
      nextLoanNumber: nextLoanNumber.toString(),
      message: "ඊලග ණය අංකය සාර්ථකව ලබා ගන්නා ලදි"
    });

  } catch (error) {
    console.error("Error getting next loan number:", error);
    res.status(500).json({
      success: false,
      message: "ණය අංකය ලබා ගැනීමේදී දෝෂයක් සිදුවිය",
      error: error.message
    });
  }
};
