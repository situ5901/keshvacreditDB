const express = require("express");
const router = express.Router();
const contoller = require("./CSCenter.js");
const GoldLoan = require("../GoldLoan/GoldLoan.js");
router.post("/register", contoller.register);

router.post("/login", contoller.login);

router.get("/detail/user/:identifier", contoller.getUserDetail);

router.put("/update/:username", contoller.updateUser);

router.post("/apply/gold/loan", GoldLoan.applyGoldLoan);
router.get("/test", contoller.test);
router.post("/get/center/data", contoller.getCPartnerDatabyID);
router.patch("/update/:username/add-amount", contoller.addAmount);

module.exports = router;
