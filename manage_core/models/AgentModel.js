const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema({
  AgentMail: { type: String, required: true },
  Agentname: { type: String, required: true }, // ✅ match this
  AgentPassword: { type: String, required: true }, // ✅ match this
});

module.exports = mongoose.model("Agent", agentSchema);
