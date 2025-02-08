const MembershipPayment = require("../models/MembershipPayment");
const FinePayment = require("../models/FinePayment");
const Member = require ('../models/Member')


exports.createReceipts = async (req, res) => {
    const { date, paymentsArray } = req.body;
//   console.log(paymentsArray)
  // Validate request body
  if (!date || !Array.isArray(paymentsArray)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  let membershipPayments = 0;
  let finePayments = 0;
  const errors = [];

  try {
    for (const val of paymentsArray) {
      const { member_Id, memPayment, finePayment } = val;

      // Validate required fields
      if (!member_Id) {
        errors.push({ entry: val, error: "Missing member_Id" });
        continue; // Skip this entry
      }
      // console.log('member_Id: ', member_Id)
      try {
        // Create MembershipPayment record
        if (memPayment>0) {
          const newMembershipPayment = new MembershipPayment({
            date,
            memberId: member_Id,
            amount: memPayment,
          });
          await newMembershipPayment.save();
          membershipPayments++;
        }
   
        // Create FinePayment record
        if (finePayment>0) {
          const newFinePayment = new FinePayment({
            date,
            memberId: member_Id,
            amount: finePayment,
          });
          await newFinePayment.save();
          const member= await Member.findById({_id:member_Id})
          // console.log('member: ', member)
          if (member) {
            member.previousDue -= finePayment; 
            await member.save(); 
          } else {
            throw new Error("Member not found");
          }
          finePayments++;
        }
      } catch (paymentError) {
        errors.push({ entry: val, error: paymentError.message });
      }
    }

    // Send final response
    res.status(200).json({
      message: "Payments processing completed",
      membershipPayments,
      finePayments,
      errors,
    });
  } catch (error) {
    console.error("Error creating payments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}