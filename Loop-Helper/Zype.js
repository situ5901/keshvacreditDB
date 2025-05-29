const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const DEDUPE_API_URL =
  "https://api.rupee112fintech.com/marketing-check-dedupe/";
const MARKETING_PUSH_API_URL =
  "https://api.rupee112fintech.com/marketing-push-data";

const Partner_id = "Keshvacredit";
const loanAmount = "20000"; // string
const MAX_LEADS = 50;

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Auth: "a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendToDedupeAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };
    console.log("📤 Sending Lead Data to Dedupe API:", apiRequestBody);
    const response = await axios.post(DEDUPE_API_URL, apiRequestBody, {
      headers: getHeaders(),
    });
    console.log("✅ Dedupe API Response Received:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "🚫 Dedupe API Call Failed for",
      lead.phone,
      ":",
      error.message,
    );
    return { Status: 0, Error: error.response?.data?.Error };
  }
}

async function sendToMarketingPushAPI(lead) {
  try {
    const apiRequestBody = {
      full_name: lead.name || "",
      mobile: lead.phone || "",
      email: lead.email || "",
      pancard: lead.pan || "",
      pincode: lead.pincode || "",
      income_type: "1",
      monthly_salary: lead.income || "",
      purpose_of_loan: "Other",
      loan_amount: loanAmount,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Lead Data to Marketing Push API:", apiRequestBody);
    const response = await axios.post(MARKETING_PUSH_API_URL, apiRequestBody, {
      headers: getHeaders(),
    });
    console.log("✅ Marketing Push API Response Received:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "🚫 Marketing Push API Call Failed for",
      lead.phone,
      ":",
      error.message,
    );
    return null;
  }
}

async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        const dedupeResponse = await sendToDedupeAPI(user);

        let pushResponse = null;
        if (
          dedupeResponse.Status === 2 &&
          dedupeResponse.Message === "User not found"
        ) {
          console.log(
            `🔍 Dedupe condition met for ${user.phone}, calling marketing push API.`,
          );
          pushResponse = await sendToMarketingPushAPI(user);
        } else {
          console.log(
            `❌ Dedupe condition NOT met for ${user.phone}, skipping marketing push API.`,
          );
        }

        const updateDoc = {
          $push: {
            apiResponse: {
              rupee112Dedupe: dedupeResponse,
              ...(pushResponse && { marketingPushData: pushResponse }),
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "Rupee112", // Always Rupee112 here
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        };

        const updateResult = await UserDB.updateOne(
          { phone: user.phone },
          updateDoc,
        );
        console.log(`✅ MongoDB updated for ${user.phone}:`, updateResult);
      } catch (error) {
        console.error(`🚫 Error processing user ${user.phone}:`, error);
      }
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Error processing user at index ${index}:`, result.reason);
    } else {
      console.log(`Successfully processed user at index ${index}`);
    }
  });
}

async function loop() {
  try {
    let hasMoreLeads = true;
    while (hasMoreLeads) {
      console.log("🔄 Fetching users...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Rupee112" },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        console.log(`✅ Processed batch of ${leads.length} leads`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay between batches
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}

loop();
