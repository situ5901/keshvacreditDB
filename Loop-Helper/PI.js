const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;
const TOKEN_API_URL = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LEAD_API_URL =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";

const BATCH_SIZE = 10;
const REF_NAME = "PI";

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);
async function getAuthToken() {
  const payload = {
    client_id: "keshvacredit",
    client_secret: "AW21Bu)jQ15eiDf[",
  };
  const { data } = await axios.post(TOKEN_API_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data?.auth_token || data?.data?.auth_token;
}

function formatDate(dob) {
  try {
    const date = new Date(dob);
    if (isNaN(date)) return null;
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}
// 📤 Send Single Lead to Pointz API
async function sendToPI(user, token) {
  const payload = {
    client_request_id: "REQ202507160001",
    name: {
      first: user.name,
      last: "Sharma",
    },
    phone_number: user.phone,
    email: user.email,
    pan: user.pan,
    dob: formatDate(user.dob),
    current_address: {
      pincode: String(user.pincode || "110001"),
    },
    employment_details: {
      employment_type: user.employment,
      monthly_income: user.income,
    },
    loan_requirement: {
      desired_loan_amount: String(user.desired_loan_amount || 350000),
    },
    custom_fields: {
      utm_source: "google_ads",
      agent_code: "AGT777",
      ref_campaign: "monsoon-offer-2025",
    },
    evaluation_type: "BASIC",
  };

  try {
    const { data } = await axios.post(LEAD_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // ✅ Full response printed
    console.log("✅ Full API Response:\n", JSON.stringify(data, null, 2));
    return { success: true, data };
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error("❌ API Error:\n", JSON.stringify(errorData, null, 2));
    return { success: false, data: errorData };
  }
}

// 🔁 Process Batch of Leads
async function processBatch(users, token) {
  await Promise.all(
    users.map(async (user) => {
      const result = await sendToPI(user, token);

      const updateDoc = {
        $push: {
          apiResponse: {
            PIResponse: result.data, // ✅ Full API response saved
            status: result.data?.status?.code || "UNKNOWN",
            message: result.data?.status?.message || "",
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: REF_NAME,
            createdAt: new Date().toISOString(),
          },
        },
      };

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    }),
  );
}

// ▶️ Main Loop
async function main() {
  try {
    const token = await getAuthToken();

    while (true) {
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: REF_NAME } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed.");
        break;
      }

      await processBatch(leads, token);
      console.log(`✅ Processed ${leads.length} leads`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    mongoose.connection.close();
  }
}

main();
