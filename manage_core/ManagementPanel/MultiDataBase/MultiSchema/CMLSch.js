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

  // Iska naam wahi rakhein jo controller mein use kar rahe hain
  return {
    PersonalPayMe: connection.model("Personalpayme", leaderSchema, "payme"),
  };
};
