const bcrypt = require("bcrypt");
const AgentModel = require("../../models/AgentModel.js");

exports.login = async (req, res) => {
  try {
    const { Agentname, AgentMail, AgentPassword } = req.body;

    if (!AgentMail || !AgentPassword || !Agentname) {
      return res
        .status(400)
        .json({ message: "❌ Email/Name & Password required" });
    }

    const agent = await AgentModel.findOne({ AgentMail, Agentname });

    if (!agent) {
      return res
        .status(401)
        .json({ message: "❌ Invalid email, name, or password" });
    }

    const isMatch = await bcrypt.compare(AgentPassword, agent.AgentPassword);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "❌ Invalid email, name, or password" });
    }

    return res.status(200).send("✅ Welcome to Agent Dashboard");
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "❌ Server error" });
  }
};
