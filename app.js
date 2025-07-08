const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const corsMiddleware = require("./middlewares/cors");
const errorHandler = require("./middlewares/errorHandler");
const { API_VERSION } = require("./config/config");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsMiddleware);

app.use(`/api${API_VERSION}/auth`, require("./routes/auth"));
app.use(`/api${API_VERSION}/leads`, require("./routes/leads"));
app.use(
  `/api${API_VERSION}/eligibility`,
  require("./Show_Lenders/Lender_List"),
);
app.use(`/api${API_VERSION}/api`, require("./routes/api"));
app.use(`/api${API_VERSION}/getAll`, require("./routes/allapis"));
app.use(`/api${API_VERSION}/leaveSend`, require("./utils/leaveMail"));
app.use(`/api${API_VERSION}/employee`, require("./employee/Daily_Work"));
app.use(`/api${API_VERSION}/partner`, require("./PartnersAPIs/Creditsea"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/MoneyView"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/smartcoin"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Rupee"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Mpokket"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/kamakshi"));
app.use(`/api${API_VERSION}/utiles`, require("./utils/adsMail"));
app.use(
  `/api${API_VERSION}/LenderAPIs`,
  require("./Lenders-APIs/instantmudra"),
);
app.use(
  `/api${API_VERSION}/LenderAPIs`,
  require("./Lenders-APIs/chintamani05"),
);
app.use(
  `/api${API_VERSION}/LenderAPIs`,
  require("./Lenders-APIs/salaryontime"),
);
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/FatakPayDCL"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/FatakPay"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/LoanTap"));
app.use(`/api${API_VERSION}/Test`, require("./Test/filter.js"));
app.use(errorHandler);

// app.use(`/api${API_VERSION}/manageC`, require("./manageC/admin"));
const adminRoutes = require("./manageC/adminSpace/admin.js");

// Use Route
app.use(`/api${API_VERSION}/manageC`, adminRoutes);

module.exports = app;
