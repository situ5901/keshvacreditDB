const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const multer = require("multer");
const FormData = require("form-data");
const corsMiddleware = require("./middlewares/cors");
const errorHandler = require("./middlewares/errorHandler");
const { API_VERSION } = require("./config/config");

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Memory Usage (in MB):`);
  console.log(`  RSS         : ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `  Heap Total  : ${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  );
  console.log(`  Heap Used   : ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External    : ${(used.external / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `  ArrayBuffer : ${(used.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
  );
}, 50000); // Every 5 seconds
app.use(corsMiddleware);
app.use(express.json());
app.use(logger("dev"));
app.use(cookieParser());
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
// app.use(`/api${API_VERSION}/partner`, require("./PartnersAPIs/Creditsea"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/MoneyView"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/smartcoin"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Rupee"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Mpokket"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/kamakshi"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/CapitalNow"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/PI.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Faircent.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/FaircentUpload.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Branch.js"));
app.use(
  `/api${API_VERSION}/LenderAPIs`,
  require("./Lenders-APIs/BajajFinance"),
);
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
app.use(`/api${API_VERSION}/Test`, require("./LDClub/filter.js"));
app.use(errorHandler);
//............LeadBridge Working............//
const adminRoutes = require("./manage_core/admin_panel/routes/adminRoutes.js");
app.use(`/api${API_VERSION}/admin`, adminRoutes);

//............LEaders Working............//

const LeadersRoutes = require("./manage_core/Leaders/Leaders_route.js");
app.use(`/api${API_VERSION}/leaders`, LeadersRoutes);
//............Member Working............//
const memberRoutes = require("./manage_core/admin_panel/routes/userRoutes.js");
app.use(`/api${API_VERSION}/member`, memberRoutes);

//............Agent Working............//
app.use(
  `/api${API_VERSION}/agent`,
  require("./manage_core/admin_panel/routes/agentRoute.js"),
);

//............Management Panel Working............//
app.use(
  `/api${API_VERSION}/manage`,
  require("./manage_core/ManagementPanel/Management_Routes"),
);

app.use(
  `/api${API_VERSION}/manage/utils`,
  require("./manage_core/ManagementPanel/Management_Routes"),
);
//.................Business Loan Working............//
app.use(`/api${API_VERSION}/BLoan`, require("./routes/BL/BusinessLoan"));

module.exports = app;
