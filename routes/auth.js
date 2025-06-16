const express = require("express");
const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({ message: "Successfully connected to the server." });
});

module.exports = router;
