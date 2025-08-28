const express = require("express");
const router = express.Router();
const adminController = require("../admin_panel/controllers/adminController.js");
const adminAuth = require("../admin_panel/middlewares/adminAuth");
const ManagementController = require("../ManagementPanel/ManageMant");

router.get("/campin", ManagementController.campianData);
router.get("/Memberlogin", ManagementController.dashboard);
module.exports = router;
