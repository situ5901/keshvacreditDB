const express = require("express");
const router = express.Router();
const adminAuth = require("../admin_panel/middlewares/adminAuth");
const ManagementController = require("./ManageMant");

// router.post("/impdata", ManagementController.importData);
router.get("/campin", ManagementController.campianData);
// router.post("/Memberlogin", ManagementController.Managementlogin);
// router.get("/CampiangData", ManagementController.CampiangData);
// router.post("/deleteimpdata", ManagementController.deleteImpData);
// router.post("/exportdata", ManagementController.ExportData);

// router.get("/allCollData", ManagementController.getAllCollData);
// router.get("/allData",  ManagementController.situ);
module.exports = router;
