// models/apismcoll.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const apismcollSchema = new Schema(
  {
    phone: { type: String }, // optional root field
    name: { type: String }, // optional root field

    apiResponse: {
      type: Schema.Types.Mixed, // 🔥 dynamic nested JSON allowed
      required: true,
    },
  },
  {
    timestamps: true,
    strict: false, // extra fields bhi save ho jaayenge
  },
);
module.exports =
  mongoose.models.smcoll || mongoose.model("apismcoll", apismcollSchema);
