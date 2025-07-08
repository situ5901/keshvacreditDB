const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const userAuth = require("../middlewares/userAuth");

const adminController = require("../controllers/adminController");
const adminAuth = require("../middlewares/adminAuth");

router.post("/login", userController.login);
router.get("/dashboard", userAuth, userController.dashboard);

router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.dashboard);
// router.post("/create-user", adminAuth, adminController.createUser);
module.exports = router;
