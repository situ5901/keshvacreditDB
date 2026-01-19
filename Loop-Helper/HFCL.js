const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const apiDocs = "https://los-test.api.sb.herofincorp.com/v1/partner-offer";
const partnerCode = "partnership_keshvacredit";

const MONGODB_URINEW = process.env.MONGODB_RSUnity;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "creditfy",
  new mongoose.Schema({}, { collection: "creditfy", strict: false }),
);

function formatDOB(dob) {
  if (!dob) return "01/01/1990";
  const parts = dob.split("-");
  if (parts.length !== 3) return "01/01/1990";
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

async function getHFCL(user) {
  const headers = {
    "X-API-KEY": "HFC-OFFER_API_partnership_keshvacredit",
    "Content-Type": "application/json",
  };

  const dobFixed = formatDOB(user.dob);

  // Aapke cURL ke exact format ke hisaab se payload
  const payload = {
    mobileNumber: String(user.phone).slice(-10),
    pan: user.pan ? user.pan.toUpperCase() : "",
    firstName: user.name || "XXXX",
    lastName: user.last_name || "kumar",
    fatherName: "Noname",
    dob: dobFixed,
    gender: user.gender || "Male",
    pinCode: String(user.pincode),
    source: partnerCode,
    netAnnualIncome: 220000, // Number format as per curl
    employmentType: user.employment || "Salaried",
    partnerReferenceId: "TEST_REF_" + Date.now(),

    // Dono consent fields add kar diye hain
    bureauPrivacyPolicyConsent: "Y",
    consent: user.consent,

    addresses: [
      {
        addressType: "MAILING",
        line1: ".",
        line2: ".",
        city: user.city || "South West Delhi",
        state: user.state || "Delhi",
        country: "India",
        pin: String(user.pincode),
        landmark: ".",
      },
    ],
  };

  try {
    console.log("Usre PayLoad", payload);
    const response = await axios.post(apiDocs, payload, { headers });
    console.log(`📥 API Response for ${user.phone}:`, response.data.message);
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data || { message: error.message };
    console.error(`❌ API Error for ${user.phone}:`, JSON.stringify(errorMsg));
    return { success: false, ...errorMsg };
  }
}

async function processBatch(users) {
  let batchSuccessCount = 0;

  const promises = users.map(async (user) => {
    try {
      const apiResponse = await getHFCL(user);

      // Status check for success count
      if (apiResponse.status === 200 || apiResponse.statusCode === 200) {
        batchSuccessCount++;
      }

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            RefArr: { name: "HFCL", createdAt: new Date() },
            apiResponse: {
              name: "HFCL",
              response: apiResponse,
              createdAt: new Date(),
            },
          },
          $unset: { accounts: "" },
        },
      );
    } catch (err) {
      console.error("❌ Error in processBatch:", err.message);
    }
  });

  await Promise.allSettled(promises);
  return batchSuccessCount;
}

async function Loop() {
  let totalLeads = 0;
  let successCount = 0;

  try {
    while (true) {
      console.log("📦 Fetching new leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $nin: ["HFCL", "SkippedHFCL"] },
            phone: { $exists: true, $ne: "" },
          },
        },
        { $limit: 1 },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed.");
        break;
      }

      const batchSuccess = await processBatch(leads);
      successCount += batchSuccess;
      totalLeads += leads.length;

      console.log(
        `🏁 Successful: ${successCount} | Total Processed: ${totalLeads}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("❌ Loop error:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
