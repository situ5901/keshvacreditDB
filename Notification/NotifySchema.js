const mongoose = require("mongoose");

const NotifySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const TokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
});

const Notify = mongoose.model("Notification", NotifySchema);
const Token = mongoose.model("FirebaseToken", TokenSchema);

module.exports = { Notify, Token };
