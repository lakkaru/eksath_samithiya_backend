const express = require('express');
const router = express.Router();
const { getActiveLoans, getLoanOfMember, createLoanPayments } = require('../controllers/loanController'); // Adjust the path if needed
const authMiddleware = require("../middleware/authMiddleware"); 

//get all active loans
router.get('/active-loans',authMiddleware(['loan-treasurer']), getActiveLoans);
//get loan of a member
router.get('/member/:memberId',authMiddleware(['loan-treasurer']), getLoanOfMember);
//put all payments made for a loan
router.post('/Payments',authMiddleware(['loan-treasurer']), createLoanPayments);

module.exports = router;
