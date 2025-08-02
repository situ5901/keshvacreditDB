require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URINEW,
  API_VERSION: process.env.API_VERSION || "/v1",
  ALLOWLIST: [
    "https://keshvacredit.com",
    "https://www.keshvacredit.com",  
    "https://13.200.229.187",
    "http://localhost:5000",
    "http://localhost:3000",
  ],
};
