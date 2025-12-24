const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    employment: { type: String, required: true, trim: true },
    pan: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    income: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    creditScore: { type: String, trim: true },
    dob: { type: String, required: true, trim: true },
    gender: { type: String, required: true, trim: true },
    partner_Id: { type: String, required: true, trim: true },
  },
  { strict: false },
);

const customerschema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  pan: { type: String, unique: true },
});

const partnerdb = mongoose.model("partnerdb", userSchema, "partners");
const customer = mongoose.model("userdb", customerschema, "userdb");

module.exports = {
  partnerdb,
  customer,
};
