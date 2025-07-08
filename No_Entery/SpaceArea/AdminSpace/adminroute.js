const express = require("express");
const router = express.Router();
const adminController = require("./adminSpace");
const adminlogin = require("./adminSpace");
const memberController = require("../member/memberSpace");

router.get("/health", adminController.healthCheck);
router.post("/login", adminController.login);
router.post("/member", memberController.healthCheck);

module.exports = router;
