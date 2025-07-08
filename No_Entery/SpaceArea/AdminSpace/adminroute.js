const express = require("express");
const router = express.Router();
const adminController = require("./adminSpace");
const adminlogin = require("./adminSpace");

router.get("/health", adminController.healthCheck);

module.exports = router;

//continue
