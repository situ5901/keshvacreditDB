const express = require("express");
const router = express.Router();
const agentController = require("../../agentPanel/AgentController/agentCrow");
router.post("/login", agentController.login);
module.exports = router;
