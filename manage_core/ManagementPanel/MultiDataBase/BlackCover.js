const mongoose = require("mongoose");

const BlackCover = mongoose.createConnection(process.env.MONGODB_BLACKCOVER);

BlackCover.on("connected", () => {
  console.log("🎉BlackCover Database Connected Successfully");
});

module.exports = BlackCover;
