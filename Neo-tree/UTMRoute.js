const express = require("express");
const router = express.Router();
const UTMController = require("../Neo-tree/Treacking/UtmTrack");

router.post("/utm", UTMController.generateUTM);
module.exports = router;


