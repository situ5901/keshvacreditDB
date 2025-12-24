const mongoose = require("mongoose");

const docSchema = new mongoose.Schema({
  loan_id: { type: String, required: true },
  type: { type: String, required: true },
  fileName: { type: String, required: true },
  fileData: { type: Buffer, required: true }, // store file as buffer
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DocCollection", docSchema);

