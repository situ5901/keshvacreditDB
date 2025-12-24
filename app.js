const express = require("express");
const session = require("express-session"); // Fixed: Now session is defined
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const corsMiddleware = require("./middlewares/cors");
const errorHandler = require("./middlewares/errorHandler");
const { API_VERSION } = require("./config/config");
const UTMROUTE = require("./Neo-tree/UTMRoute");

const app = express();
app.set('trust proxy', 1);

app.use(session({
  name: 'keshva_session',
  secret: 'DevOps',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(corsMiddleware);

app.use(express.urlencoded({ extended: true })); 
app.use(
  `/api${API_VERSION}/LenderAPIs`,
  require("./Lenders-APIs/FaircentUpload.js"),
); // Added Faircent Upload
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
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(`/`, require("./routes/auth"));
app.use(`/api${API_VERSION}/leads`, require("./routes/leads"));
app.use(`/api${API_VERSION}/generateUTM`, UTMROUTE);
app.use(`/api${API_VERSION}/camping`, UTMROUTE);
app.use(
  `/api${API_VERSION}/eligibility`,
  require("./Show_Lenders/Lender_List"),
);
app.use(`/api${API_VERSION}/api`, require("./routes/api"));
app.use(`/api${API_VERSION}/getAll`, require("./routes/allapis"));
app.use(`/api${API_VERSION}/leaveSend`, require("./utils/leaveMail"));
app.use(`/api${API_VERSION}/employee`, require("./employee/Daily_Work"));
app.use(`/api${API_VERSION}/payme`, require("./Lenders-APIs/PayMe.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/MoneyView"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/smartcoin"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Rupee"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Mpokket"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/kamakshi"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/CapitalNow"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/PI.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Faircent.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Branch.js"));
app.use(`/api${API_VERSION}/LenderAPIs`, require("./Lenders-APIs/Ramfin.js"));

app.use(`/api${API_VERSION}/KCPartners`, require("./PartnersAPIs/Creditsea.js"));
app.use(
  `/api${API_VERSION}/LenderAPIs`,
  require("./Lenders-APIs/CreditSea.js"),
);

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
  require("./manage_core/agentPanel/AgentController/agentRoute.js"),
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

//..................CSC Working............//
app.use(`/api${API_VERSION}/csc`, require("./manage_core/CSC/65Routes.js"));

app.use(`/api${API_VERSION}/csc`, require("./manage_core/CSC/65Routes.js"));





module.exports = app;
