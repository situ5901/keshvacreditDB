const express = require("express");
const router = express.Router();
const agentController = require("../../agentPanel/AgentController/agentCrow");
router.get("/login", agentController.login);
module.exports = router;
