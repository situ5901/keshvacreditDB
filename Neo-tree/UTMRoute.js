const express = require("express");
const router = express.Router();
const UTMController = require("../Neo-tree/Treacking/UtmTrack");

router.post("/utm", UTMController.generateUTM);
router.post("/send-otp", UTMController.SendOtpCamp);
router.post("/otp/verify", UTMController.VerifyOtpCamp);

module.exports = router;


