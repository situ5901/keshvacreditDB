const express = require("express");
const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({ message: "Ho gai API Start BackEnd Live ho gya bhai.... Dak le" });
});

module.exports = router;
