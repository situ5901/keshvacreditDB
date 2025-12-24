const express = require("express");
const router = express.Router();
const agentController = require("../../agentPanel/AgentController/agentCrow");
router.post("/login", agentController.login);
router.get("/getAgents", agentController.getAgents);
router.get("/test", agentController.test);
module.exports = router;
