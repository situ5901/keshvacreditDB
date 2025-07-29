const mongoose = require("mongoose");

const infiSchema = new mongoose.Schema({}, { strict: false });
module.exports = mongoose.model("memberData", infiSchema);
