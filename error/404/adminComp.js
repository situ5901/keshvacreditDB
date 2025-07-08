// adminSpace.js
exports.healthCheck = (req, res) => {
  return res.status(200).json({ message: "Hello Admin" });
};
