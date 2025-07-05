const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    phone: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = model("User", userSchema, "userdb"); // 3rd argument is the collection name
