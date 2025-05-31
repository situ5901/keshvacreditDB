const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    employeeType: { type: String, required: true, trim: true },
    pan: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    income: { type: Number, required: true },
    dob: { type: Date, required: true }, // Date type recommended
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
