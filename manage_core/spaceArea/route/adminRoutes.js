const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController"); // 👈 Check path here

router.get("/", adminController.dashboard); // ✅

module.exports = router;
