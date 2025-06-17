require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const figlet = require("figlet");
const chalkAnimation = require("chalk-animation"); // lolcat style
const User = require("./models/user.model");

const API_VERSION = process.env.API_VERSION || "/v1";
const MONGODB_URI = process.env.MONGODB_URIVISH;
const PORT = process.env.PORT || 5000;

const app = express();

const allowlist = [
  "https://keshvacredit.com",
  "https://13.200.229.187",
  "http://localhost:5000",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowlist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const auth = require("./routes/auth.js");
const leads = require("./routes/leads.js");
const eligibility = require("./Show_Lenders/Lender_List.js");
const api = require("./routes/api.js");
const getAll = require("./routes/allapis.js");
const leaveSend = require("./utils/leaveMail.js");
const employee = require("./employee/Daily_Work.js");
const partner = require("./PartnersAPIs/Creditsea.js");
const LenderAPIs = require("./Lenders-APIs/MoneyView.js");

app.use(`/api${API_VERSION}/auth`, auth);
app.use(`/api${API_VERSION}/leads`, leads);
app.use(`/api${API_VERSION}/eligibility`, eligibility);
app.use(`/api${API_VERSION}/api`, api);
app.use(`/api${API_VERSION}/getAll`, getAll);
app.use(`/api${API_VERSION}/leaveSend`, leaveSend);
app.use(`/api${API_VERSION}/employee`, employee);
app.use(`/api${API_VERSION}/partner`, partner);
app.use(`/api${API_VERSION}/LenderAPIs`, LenderAPIs);
app.use((err, req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message });
});

mongoose.set("strictQuery", false);

async function main() {
  try {
    figlet("Situ-Kumar", (err, data) => {
      if (err) {
        console.error("❌ Figlet Error:", err);
      } else {
        const rainbow = chalkAnimation.rainbow(data); // 🌈 Animated Situ

        setTimeout(() => {
          rainbow.stop();
          console.log("🛜 Connecting to MongoDB...");
        }, 3000);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 3500)); // Wait for animation

    await mongoose.connect(MONGODB_URI);
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
