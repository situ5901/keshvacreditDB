// AdmainRoute.js
const express = require("express");
const router = express.Router();

// ✅ Make sure this path is correct relative to this file
const adminController = require("./adminComp.js");

// ✅ healthCheck must be defined in adminController
router.get("/health", adminController.healthCheck);

module.exports = router;
