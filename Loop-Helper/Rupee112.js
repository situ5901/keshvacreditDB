const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const MAX_LEADS = 15;
let processedCount = 0;

const dedupe = "https://api.rupee113fintech.com/marketing-check-dedupe/";
const punchAPIs = "https://api.rupee113fintech.com/marketing-push-data/";

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250422",
    Authorization:
      "Basic a155c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendToNewAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };

    console.log(
      "📤 Sending Lead Data to Primary API (dedupe):",
      apiRequestBody,
    );
    const response = await axios.post(dedupe, apiRequestBody, {
      headers: getHeaders(),
    });

    const responseData = response.data;

    if (
      responseData.Status === "3" &&
      responseData.Message === "User not found" // Watch for non-breaking space!
    ) {
      console.log(
        "✅ Dedupe API: User not found. Sending full payload to Punch API...",
      );

      const loanAmount = 20000;
      const partner_id = "Keshvacredit";

      const payload = {
        full_name: lead.name,
        email: lead.email,
        mobile: lead.phone,
        pancard: lead.pan,
        pincode: lead.pincode,
        income_type: lead.income,
        loan_amount: loanAmount,
        customer_lead_id: partner_id,
      };

      try {
        const fallbackResponse = await axios.post(punchAPIs, payload, {
          headers: getHeaders(),
        });

        console.log("✅ Punch API Response:", fallbackResponse.data);
        return {
          ...fallbackResponse.data,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        console.error("🚫 Punch API Call Failed:", fallbackError.message);
        return {
          Status: 1,
          Error:
            fallbackError.response?.data?.Error ||
            fallbackError.response?.statusText ||
            "Unknown fallback API error",
          fallbackUsed: true,
        };
      }
    } else {
      console.log(
        "ℹ️ Dedupe API: User found or not eligible. Skipping fallback.",
      );
      return null;
    }
  } catch (error) {
    console.error("🚫 Primary API Call Failed:", error.message);
    return {
      Status: 1,
      Error:
        error.response?.data?.Error ||
        error.response?.statusText ||
        "Unknown API error",
    };
  }
}

async function processBatch(users) {
  const promises = users.map((user) => sendToNewAPI(user));
  const results = await Promise.all(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    if (!response) {
      console.log(
        `ℹ️ Skipping DB update for ${user.phone} (Not sent to punch API).`,
      );
      continue;
    }

    console.log(`📦 Updating DB for ${user.phone} with response:`, response);

    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              Status: response.Status,
              message: response.Message || response.Error || "",
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "Rupee113",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        },
      );
      console.log(`✅ MongoDB updated for ${user.phone}:`, updateResponse);
    } catch (updateError) {
      console.error(
        `🚫 Failed to update MongoDB for ${user.phone}:`,
        updateError,
      );
    }
  }
}

async function loop() {
  try {
    console.log("🔄 Fetching users...");
    const leads = await UserDB.aggregate([
      {
        $match: {
          "RefArr.name": { $ne: "Rupee113" },
        },
      },
      { $limit: MAX_LEADS },
    ]);

    if (leads.length === 0) {
      console.log("🚫 No more leads to process.");
    } else {
      await processBatch(leads);
      processedCount += leads.length;
      console.log(`✅ Total Processed: ${processedCount}`);
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message, error);
  } finally {
    console.log("🔚 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}

loop();
