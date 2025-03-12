const express = require("express");
const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({ message: "Auth API is working!" });
});

module.exports = router;
