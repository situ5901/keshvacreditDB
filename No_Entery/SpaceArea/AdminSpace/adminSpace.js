const jwt = require("jsonwebtoken");
const Id = "situ";
const Pass = "situk";

exports.healthCheck = (req, res) => {
  return res.status(200).json({ message: "Hello Admin" });
};

exports.login = (req, res) => {
  const { adminId, adminPass } = req.body;
  if (!adminId || adminId !== Id || !adminPass || Pass !== "situk") {
    return res.status(400).json({ message: "Please provide name" });
  }
  const token = jwt.sign({ adminId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return res.status(200).json({ message: "Hello " + adminId, token: token });
};
