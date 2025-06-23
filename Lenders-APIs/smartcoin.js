require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Userdb = require("../Lenders-APIs/PartnerSchema.js");

router.get("/test", (req, res) => {
  res.send("Hello World");
});

module.exports = router;
