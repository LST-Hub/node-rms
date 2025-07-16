const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/signup", authController.signup);
router.patch("/verify-otp", authController.verifyOtp);  
router.post("/login", authController.login);
router.post("/resend-otp", authController.resendOtp);

module.exports = router;
