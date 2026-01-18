const { Schema } = require("mongoose");

module.exports = (connection) => {
  const leaderSchema = new Schema(
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
      RefArr: [Object], // Object ko array mein rakhna behtar hai agar multiple entries hain
      apiResponse: [Object],
    },
    { versionKey: false, strict: false }, // strict: false zaroori hai agar data dynamic hai
  );

  return {
    fatakPayCOll: connection.model("fatakpay_CV", leaderSchema, "fatakpay"),
    // Yahan naam "LoanTapCOll" rakhein taaki ManageMant.js se match kare
    LoanTapCOll: connection.model("loantap_CV", leaderSchema, "loantap"),
  };
};
