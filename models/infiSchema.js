const mongoose = require("mongoose");

const infiSchema = new mongoose.Schema(
  {},
  { strict: false, versionKey: false },
);
module.exports = mongoose.model("memberData", infiSchema);
