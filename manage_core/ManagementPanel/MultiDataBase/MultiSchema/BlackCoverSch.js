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
      RefArr: Object,
      apiResponse: Object,
    },
    { versionKey: false },
  );

  // Sirf mvcoll aur payme models return kar rahe hain
  return {
    fatakPayCOll: connection.model("fatakpay_CV", leaderSchema, "fatakpay"),
  };
};
