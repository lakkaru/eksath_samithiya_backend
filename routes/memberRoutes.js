const express = require("express");
const memberController=require('../controllers/memberController')
const authMiddleware = require("../middleware/authMiddleware"); 

const router = express.Router();

//getting admins for work assignments
// router.get("/getAdminsForFuneral", adminController.getAdminsForFuneral);
router.get("/get-all-data-by-id",authMiddleware(["vice-secretory"]) , memberController.getAllDataById);
// get-admin-for-

//create member
// router.post("/create", memberController.createMember);
module.exports = router;
