const cors = require("cors");
const { ALLOWLIST } = require("../config/config");

module.exports = (req, res, next) => {
  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || ALLOWLIST.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS Blocked Origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  return cors(corsOptions)(req, res, next);
};
