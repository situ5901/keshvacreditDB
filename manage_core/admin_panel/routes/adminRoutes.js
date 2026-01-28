const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuth = require("../middlewares/adminAuth");
const filterDatabase = require("../filterDB/filterDatabase");
const getLendersData = require("../controllers/adminController");
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
router.get("/get/LenderData", adminController.getLendersData);
router.post("/get/partnerData", adminAuth, adminController.getPartnerData);
router.post("/get/membersData", adminController.getMembersData);
router.post("/Leaderslogin", adminController.Adminlogin);

//...............CSC..Panels.........................................................................
router.post("/create/cscCenter", adminAuth, adminController.cscAgents);
router.get("/get/cscAgent", adminAuth, adminController.getCSCAgents);
router.post("/delete/cscAgent", adminAuth, adminController.deletecsc);

//----------------------notification Panels
router.get("/notification", adminController.notification);
router.post("/save/token", adminController.saveToken);
router.post("/send/token", adminController.SendToken);
router.get("/get/notifications", adminController.getNotifications);
module.exports = router;
