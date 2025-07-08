const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const memberSchema = new Schema({
  name: { type: String, required: true },
  userID: { type: String, required: true },
  userPassword: { type: String, required: true },
});
const Member = mongoose.model("Member", memberSchema);
module.exports = Member;
