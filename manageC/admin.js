const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");

dotenv.config();

router.get("/admin/health", (req, res) => {
  console.log("✅ Admin route accessed");
  res.send("welcome to admin");
});

module.exports = router;
