const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    phone: { type: String, required: true }, // Always store as string
  },
  { timestamps: true },
);

module.exports = model("User", userSchema, "userdb");
