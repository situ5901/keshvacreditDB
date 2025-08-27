const express = require("express");
const router = express.Router();
const adminController = require("../admin_panel/controllers/adminController.js");
const adminAuth = require("../admin_panel/middlewares/adminAuth");
const ManagementController = require("../ManagementPanel/ManageMant");

router.get("/", adminAuth, ManagementController.dashboard);

router.get("/campin", adminAuth, ManagementController.campianData);
module.exports = router;
