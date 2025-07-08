const jwt = require("jsonwebtoken");
const Id = "situ";
const Pass = "situk";
exports.healthCheck = (req, res) => {
  return res.status(200).json({ message: "Hello Admin" });
};
