const MembershipPayment = require("../models/MembershipPayment");
const FinePayment = require("../models/FinePayment");
const Member = require('../models/Member');

// Get receipts by date
exports.getReceiptsByDate = async (req, res) => {
  try {
    console.log( '=== DATE QUERY DEBUG ===');
    const { date } = req.query;
    const queryDate = new Date(date);
    
    // Set time to start of day and end of day
    const startDate = new Date(queryDate.setHours(0, 0, 0, 0));
    const endDate = new Date(queryDate.setHours(23, 59, 59, 999));

    // Fetch both membership and fine payments for the date
    const [membershipPayments, finePayments] = await Promise.all([
      MembershipPayment.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('memberId', 'name member_id')
      .sort({ createdAt: -1 }),

      FinePayment.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('memberId', 'name member_id')
      .sort({ createdAt: -1 })
    ]);

    // Create a map to store aggregated payments by memberId
    const paymentMap = new Map();

    // Process membership payments - sum all payments for each member
    membershipPayments.forEach(mp => {
      const key = `${mp.memberId._id}`;
      if (paymentMap.has(key)) {
        // Add to existing total
        const existing = paymentMap.get(key);
        existing.memPayment += mp.amount;
        // Keep the most recent createdAt
        if (mp.createdAt > existing.createdAt) {
          existing.createdAt = mp.createdAt;
        }
      } else {
        // Create new entry
        paymentMap.set(key, {
          _id: mp._id,
          memberId: mp.memberId.member_id,
          name: mp.memberId.name,
          memPayment: mp.amount,
          finePayment: 0,
          member_Id: mp.memberId._id,
          date: mp.date,
          createdAt: mp.createdAt
        });
      }
    });

    // Process fine payments - sum all payments for each member
    finePayments.forEach(fp => {
      const key = `${fp.memberId._id}`;
      if (paymentMap.has(key)) {
        // Add to existing total
        const existing = paymentMap.get(key);
        existing.finePayment += fp.amount;
        // Keep the most recent createdAt
        if (fp.createdAt > existing.createdAt) {
          existing.createdAt = fp.createdAt;
        }
      } else {
        // Create new entry for fine payment
        paymentMap.set(key, {
          _id: fp._id,
          memberId: fp.memberId.member_id,
          name: fp.memberId.name,
          memPayment: 0,
          finePayment: fp.amount,
          member_Id: fp.memberId._id,
          date: fp.date,
          createdAt: fp.createdAt
        });
      }
    });

    // Convert map to array and sort by creation time
    const payments = Array.from(paymentMap.values())
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(payments);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new receipt
exports.createReceipts = async (req, res) => {
  const { date, memberId, member_Id, memPayment, finePayment } = req.body;

  try {
    let savedMemPayment, savedFinePayment;

    // Create MembershipPayment record if memPayment exists
    if (memPayment > 0) {
      const newMembershipPayment = new MembershipPayment({
        date,
        memberId: member_Id,
        amount: memPayment,
      });
      savedMemPayment = await newMembershipPayment.save();
    }

    // Create FinePayment record if finePayment exists
    if (finePayment > 0) {
      const newFinePayment = new FinePayment({
        date,
        memberId: member_Id,
        amount: finePayment,
      });
      savedFinePayment = await newFinePayment.save();

      // Update member's previousDue
      // const member = await Member.findById(member_Id);
      // if (member) {
      //   member.previousDue -= finePayment;
      //   await member.save();
      // }
    }

    res.status(200).json({
      message: "Payment recorded successfully",
      membershipPayment: savedMemPayment,
      finePayment: savedFinePayment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete receipt - delete all payments for a member on a specific date
exports.deleteReceipt = async (req, res) => {
  const { id, memberId } = req.params; // Only need date and memberId now

  try {
    const queryDate = new Date(id);
    
    // Set time to start of day and end of day
    const startDate = new Date(queryDate.setHours(0, 0, 0, 0));
    const endDate = new Date(queryDate.setHours(23, 59, 59, 999));

    // First, get the fine payments to calculate total for previousDue update
    const finePaymentsToDelete = await FinePayment.find({
      memberId: memberId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalFineDeleted = finePaymentsToDelete.reduce((sum, payment) => sum + payment.amount, 0);

    // Delete ALL payment records for the member on this date
    const [deletedMemPayments, deletedFinePayments] = await Promise.all([
      MembershipPayment.deleteMany({
        memberId: memberId,
        date: { $gte: startDate, $lte: endDate }
      }),
      FinePayment.deleteMany({
        memberId: memberId,
        date: { $gte: startDate, $lte: endDate }
      })
    ]);

    // If fine payments were deleted, update member's previousDue
    if (totalFineDeleted > 0) {
      const member = await Member.findById(memberId);
      if (member) {
        member.previousDue += totalFineDeleted;
        await member.save();
      }
    }

    if (deletedMemPayments.deletedCount === 0 && deletedFinePayments.deletedCount === 0) {
      return res.status(404).json({ error: "No payments found to delete" });
    }

    res.json({ 
      message: `Successfully deleted ${deletedMemPayments.deletedCount} membership payments and ${deletedFinePayments.deletedCount} fine payments`,
      deletedMemPayments: deletedMemPayments.deletedCount,
      deletedFinePayments: deletedFinePayments.deletedCount
    });
  } catch (error) {
    console.error("Error deleting receipts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};