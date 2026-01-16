const mongoose = require("mongoose");

const Cover_Vishu = mongoose.createConnection(process.env.COVER_VISHU);

Cover_Vishu.on("connected", () => {
  console.log("🎉 COVER_VISHU Database Connected Successfully");
});

module.exports = Cover_Vishu;
