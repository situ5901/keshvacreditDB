const express = require("express");
const router = express.Router();
const AdminLocation = require("../adminPanel/admin.js");

router.get("/healht", AdminLocation.admin);

module.exports = router;
