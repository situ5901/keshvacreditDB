const mongoose = require("mongoose");
const loanTapSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model("LoanTap", loanTapSchema);
