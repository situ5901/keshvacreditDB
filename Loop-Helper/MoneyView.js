const axios = require("axios");
const mongoose = require("mongoose");

const MONGODB_URINEW = process.env.MONGODB_URI;
mongoose
  .connect(MONGODB_URINEW, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log(err));


const UserDB = mongoose.model(
"Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
