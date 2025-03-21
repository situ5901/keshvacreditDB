require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const User = require("./models/user.model");

const API_VERSION = process.env.API_VERSION || "/v1";
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const app = express();

const allowlist = ["https://keshvacredit.com/", "http://localhost:5000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const auth = require("./routes/auth.js");
const leads = require("./routes/leads.js");
const loop = require("./PartnerAPI/LendingPlate.js");
const api = require("./routes/api.js");

app.use(`/api${API_VERSION}/auth`, auth);
app.use(`/api${API_VERSION}/leads`, leads);
app.use(`/api${API_VERSION}/loop`, loop);
app.use(`/api${API_VERSION}/api`, api);
app.use((err, req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message });
});

mongoose.set("strictQuery", false);

async function main() {
  try {
    console.log("🛜 Connecting to MongoDB...");

    await mongoose.connect(MONGODB_URI); // ✅ No need for extra options

    console.log("🎉 Database Connected Successfully 🎉");
  } catch (error) {
    console.error("❌ Database Connection Error:", error.message);
    process.exit(1);
  }
}

main();

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);

module.exports = app;
