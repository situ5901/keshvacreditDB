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
      apiResponse: Object, // Saara khel is object ke andar ke data ka hai
    },
    {
      versionKey: false,
    },
  );

  // Sirf ek model return kar rahe hain jo "dell" collection ko point karta hai
  return connection.model("DellCollection", leaderSchema, "dell");
};
