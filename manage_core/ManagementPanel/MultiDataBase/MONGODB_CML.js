const mongoose = require("mongoose");

const MONGODB_CML = mongoose.createConnection(process.env.MONGODB_CML);

MONGODB_CML.on("connected", () => {
  console.log("🎉 MONGODB_CML Database Connected Successfully");
});

module.exports = MONGODB_CML;
