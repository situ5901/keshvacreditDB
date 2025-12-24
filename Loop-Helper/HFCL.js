const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const apiDocs = "https://los-test.api.sb.herofincorp.com/v1/partner-offer";
const partnerCode = "partnership_keshvacredit";

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "zype",
  new mongoose.Schema({}, { collection: "zype", strict: false })
);

function formatDOB(dob) {
  if (!dob) return null;
  const [year, month, day] = dob.split("-");
  return `${day}/${month}/${year}`;
}

async function getHFCL(user) {
  const headers = {
    "X-API-KEY": "HFC-OFFER_API_partnership_keshvacredit",
    "Content-Type": "application/json",
  };

  const dobFixed = formatDOB(user.dob);

  const payload = {
    mobileNumber: user.phone,
    pan: user.pan,
    firstName: user.name,
    lastName: user.last_name || "kumar",
    fatherName: "Noname",
    dob: dobFixed,
    gender: user.gender,
    pinCode: user.pincode,
    source: partnerCode,
    netAnnualIncome: "220000",
    employmentType: user.employment,
    partnerReferenceId: "TEST_REF_1001",
    addresses: [
      {
        addressType: "MAILING",
        line1: ".",
        line2: ".",
        city: user.city,
        state: user.state,
        country: "India",
        pin: user.pincode,
        landmark: ".",
      },
    ],
  };

  try {
    const response = await axios.post(apiDocs, payload, { headers });
    console.log("📥 HFCL API Raw Response:", JSON.stringify(response.data, null, 2));
    return response.data;
    } catch (error) {
    console.error("❌ HFCL API Error:", error.response?.data || error.message);
    return { success: false, data: error.response?.data || { message: error.message } }; // wrap error response
  }
}

async function processBatch(users) {
  let batchSuccessCount = 0;

  const promises = users.map(async (user) => {
    try {
      const Apiresponse = await getHFCL(user);

const updateResult = await UserDB.updateOne(
        { phone: user.phone }, 
        { 
          $push: {
            RefArr: { name: "HFCL", createdAt: new Date() },
            apiResponse: {
              name: "HFCL",
              response: Apiresponse, 
              createdAt: new Date(),
            },
          },
          $unset: { accounts: "" },
        }
      );

    } catch (err) {
      console.error("❌ Error processing lead:", err.message);
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
          },
        },
        { $limit: 1 },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed. No more data.");
        break;
      }

      const batchSuccess = await processBatch(leads);
      successCount += batchSuccess;
      totalLeads += leads.length;

      console.log(`🏁 Total Successful HFCL Leads: ${successCount}`);
      console.log(`📊 Total Leads Processed So Far: ${totalLeads}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("❌ Loop error:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    console.log(`🏁 Total Successful HFCL Leads: ${successCount}`);
    mongoose.connection.close();
  }
}

Loop();
