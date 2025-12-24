const mongoose = require("mongoose");

const PartnerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  pan: String,
  dob: Date,
  email: String,
  city: String,
  state: String,
  gender: String,
  employment: String,
  income: Number,
  pincode: Number,
  consent: Date,
  partner_Id: String, 
  RefArr: Array,
  apiResponse: Object, 
});

const creditsea = mongoose.model("Partner", PartnerSchema, "partner");

module.exports = {
  creditsea,
};
