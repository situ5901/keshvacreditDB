const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  Membername: { type: String, required: true, unique: true },
  MemberMail: { type: String, required: true, unique: true },
  MemberPassword: { type: String, required: true },
});
module.exports = mongoose.model("Member", userSchema);
