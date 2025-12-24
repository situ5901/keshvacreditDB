const mongoose = require("mongoose");

const CommonSchema = new mongoose.Schema(
    {
        name: String,
        phone: String,
        pan: String,
        dob: String,
        email: String,
        city: String,
        state: String,
        gender: String,
        employment: String,
        income: String,
        pincode: String,
        consent: String,
        RefArr: {},
        apiResponse: {},
    },
    { 
        versionKey: false
    } 
);

const MoneyView = mongoose.model("mvcoll", CommonSchema, "mvcoll");
const MoneyView2 = mongoose.model("MoneyView", CommonSchema, "MoneyView");
const smcoll = mongoose.model("zype", CommonSchema, "zype");
const dailyworks = mongoose.model("dailyworks", CommonSchema, "dailyworks");
const LoanTaps = mongoose.model("LoanTap", CommonSchema, "LoanTap");

const Dell = mongoose.model("dell", CommonSchema, "dell");
const Mvcoll = mongoose.model("mvcoll", CommonSchema, "mvcoll");
const Zype = mongoose.model("zype", CommonSchema, "zype");
const Loantap = mongoose.model("LoanTap", CommonSchema, "LoanTap");
const Delhi = mongoose.model("delhi", CommonSchema, "delhi");
const PayMe = mongoose.model("PaymeDb", CommonSchema, "PaymeDb");
const PayMe2 = mongoose.model("PayMe", CommonSchema, "PayMe");
const Ramfin = mongoose.model("Ramfin", CommonSchema, "Ramfin");

module.exports = {
    MoneyView,
    MoneyView2,
    smcoll,
    dailyworks,
    LoanTaps,
    Dell,
    Mvcoll,
    Zype,
    Loantap,
    Delhi,
    PayMe,
    PayMe2,
    Ramfin,
};
