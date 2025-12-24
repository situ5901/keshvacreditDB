const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuth = require("../middlewares/userAuth");

router.post("/login", userController.login);
router.get("/getmamber", userController.getMamber);
module.exports = router;
