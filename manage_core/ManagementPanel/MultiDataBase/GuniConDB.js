const mongoose = require("mongoose");

const VishuDataBase = mongoose.createConnection(process.env.MONGODB_VISHU);

VishuDataBase.on("connected", () => {
  console.log("🎉 Vishal Database Connected Successfully");
});

module.exports = VishuDataBase;
