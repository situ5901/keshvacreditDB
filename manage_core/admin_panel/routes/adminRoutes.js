const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuth = require("../middlewares/adminAuth");
const filterDatabase = require("../filterDB/filterDatabase");
router.post("/login", adminController.login);
router.post("/delete/member", adminAuth, adminController.deleteMember);
router.post("/create/member", adminAuth, adminController.createMember);
router.post("/create/agent", adminAuth, adminController.createAgent);
router.post("/delete/agent", adminAuth, adminController.deleteAgents);
router.get("/get/all/users", adminAuth, adminController.getAllUsers);
router.get("/analysis", adminAuth, adminController.analysis);
router.get("/v1/filterdata", adminAuth, filterDatabase.filter);
router.get(
  "/v1/filterdata/delete",
  adminAuth,
  filterDatabase.deleteDuplicatePhones,
);
module.exports = router;
