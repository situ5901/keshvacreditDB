const mongoose = require("mongoose");

const CommonSchema = new mongoose.Schema({
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
  RefArr: Array,
  apiResponse: {},
});

const MoneyView = mongoose.model("mvcoll", CommonSchema, "mvcoll");
const MoneyView2 = mongoose.model("MoneyView", CommonSchema, "MoneyView");
const smcoll = mongoose.model("smcoll", CommonSchema, "smcoll");
const dailyworks = mongoose.model("dailyworks", CommonSchema, "dailyworks");
module.exports = {
  MoneyView,
  MoneyView2,
  smcoll,
  dailyworks,
};
