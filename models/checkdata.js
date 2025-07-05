const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    phone: {
      type: Number,
      required: true,
      unique: true, // Keep this, as it implies a unique index
    },
    name: String,
    email: String,
  },
  {
    timestamps: true,
    collection: "userdb",
  },
);

// REMOVE THIS LINE: userSchema.index({ phone: 1 });
// It's redundant because unique: true already creates a unique index.

module.exports = model("Users", userSchema, "userdb");
