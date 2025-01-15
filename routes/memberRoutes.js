const express = require("express");
// const memberController=require('../controllers/memberController')
const {getAllDataById, getProfileInfo, updateProfileInfo } = require("../controllers/memberController");
const authMiddleware = require("../middleware/authMiddleware"); 

const router = express.Router();


// Route to get member profile information (requires authentication)
router.get("/profile", authMiddleware(), getProfileInfo);
// Route to update member profile information (requires authentication)
router.put("/profile", authMiddleware(), updateProfileInfo);

//getting admins for work assignments
// router.get("/getAdminsForFuneral", adminController.getAdminsForFuneral);
router.get("/get-all-data-by-id",authMiddleware(["vice-secretory"]) , getAllDataById);
// get-admin-for-

//create member
// router.post("/create", memberController.createMember);
module.exports = router;
