const express = require("express");
const router = express.Router();

const LeadersController = require("../Leaders/Leaders.js");
const adminAuth = require("../admin_panel/middlewares/adminAuth.js");

router.get("/", adminAuth, LeadersController.dashboard);
router.post("/partnerData", adminAuth, LeadersController.partnerData);
module.exports = router;
