const bcrypt = require("bcrypt");
const AgentModel = require("../../models/AgentModel.js");
const jwt = require("jsonwebtoken");


exports.test = async (req, res) => {
return res.status(200).json({ message: "test" });
}


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

    const token = jwt.sign(
      { id: agent._id, role: "Agent", name: agent.Agentname },
      process.env.JWT_SECRET || "default_secret", // fallback if env var is missing
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      role: "Agent",
      message: "Login Successful",
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "❌ Server error" });
  }
};

exports.getAgents = async (req, res) => {
  try {
    const getAgents = await AgentModel.find();
    if (getAgents.length > 0) return res.status(200).json(getAgents);
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "❌ Server error" });
  }
};
