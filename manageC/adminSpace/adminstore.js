// controllers/admin.controller.js

exports.healthCheck = (req, res) => {
  console.log("✅ Admin route accessed");
  res.send("welcome to admin");
};
