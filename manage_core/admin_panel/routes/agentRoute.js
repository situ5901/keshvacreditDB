const express = require("express");
const router = express.Router();
const agentController = require("../../agentPanel/AgentController/agentCrow");
router.post("/login", agentController.login);
router.get("/getAgents", agentController.getAgents);
module.exports = router;
