const mongoose = require("mongoose");

const ASIJAVISHAL3 = mongoose.createConnection(process.env.ASIJAVISHAL3);

ASIJAVISHAL3.on("connected", () => {
  console.log("🎉 ASIJAVISHAL3 Database Connected Successfully");
});

module.exports = ASIJAVISHAL3;
