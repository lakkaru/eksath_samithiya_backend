const MembershipPayment = require("../models/MembershipPayment");
const FinePayment = require("../models/FinePayment");
const Member = require('../models/Member');

// Get receipts by date
exports.getReceiptsByDate = async (req, res) => {
  try {
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

    // Create a map to store payments by memberId
    const paymentMap = new Map();

    // Process membership payments
    membershipPayments.forEach(mp => {
      const key = `${mp.memberId._id}`;  // Use only memberId as key
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
    });

    // Process fine payments
    finePayments.forEach(fp => {
      const key = `${fp.memberId._id}`;  // Use only memberId as key
      if (paymentMap.has(key)) {
        // Update existing entry with fine payment
        const existing = paymentMap.get(key);
        existing.finePayment = fp.amount;
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
      const member = await Member.findById(member_Id);
      if (member) {
        member.previousDue -= finePayment;
        await member.save();
      }
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

// Delete receipt
exports.deleteReceipt = async (req, res) => {
  const { id, memberId, finePayment, memPayment } = req.params;

  try {
    // Delete both payment records for the member if they exist
    const [deletedMemPayment, deletedFinePayment] = await Promise.all([
      memPayment > 0 ? MembershipPayment.findOneAndDelete({
        memberId: memberId,
        amount: memPayment,
        date: new Date(id) // Using the date as identifier
      }) : null,
      finePayment > 0 ? FinePayment.findOneAndDelete({
        memberId: memberId,
        amount: finePayment,
        date: new Date(id) // Using the date as identifier
      }) : null
    ]);

    // If fine payment was deleted, update member's previousDue
    if (deletedFinePayment) {
      const member = await Member.findById(memberId);
      if (member) {
        member.previousDue += parseFloat(finePayment);
        await member.save();
      }
    }

    if (!deletedMemPayment && !deletedFinePayment) {
      return res.status(404).json({ error: "Receipts not found" });
    }

    res.json({ 
      message: "Receipts deleted successfully",
      deletedMemPayment,
      deletedFinePayment
    });
  } catch (error) {
    console.error("Error deleting receipts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};