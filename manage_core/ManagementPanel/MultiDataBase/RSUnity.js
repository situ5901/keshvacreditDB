const mongoose = require("mongoose");

const MongoDB_RSUnity = mongoose.createConnection(process.env.MONGODB_RSUnity);

MongoDB_RSUnity.on("connected", () => {
  console.log("🎉 MongoDB_RSUnity Database Connected Successfully");
});

module.exports = MongoDB_RSUnity;
