const cors = require("cors");
const { ALLOWLIST } = require("../config/config");

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWLIST.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
