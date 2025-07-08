// routes/admin.js
const express = require("express");
const router = express.Router();
const adminController = require("./adminstore.js");

// GET /admin/health
router.get("/admin/health", adminController.healthCheck);

module.exports = router;
