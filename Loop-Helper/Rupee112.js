const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

const MAX_LEADS = 5;
let processedCount = 0;
partner_id = "keshvacredit";
loanAmount = "20000";
const firstAPI = "https://api.rupee112fintech.com/marketing-check-dedupe/";
const secondAPI = "https://api.rupee112fintech.com/marketing-push-data/";

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

function getHeaders() {
  return {
    Username: "KESHVACREDIT_20250421",
    Authorization:
      "Basic a154c75adc5c96003c740668545c8ed59ff99f5ee520e8feb4b8087a41b2eb2a",
    "Content-Type": "application/json",
  };
}

async function sendToNewAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      pancard: lead.pan,
    };

    console.log("📤 Sending Lead to Check API:", apiRequestBody);
    const checkResponse = await axios.post(firstAPI, apiRequestBody, {
      headers: getHeaders(),
    });

    const checkData = checkResponse.data;
    console.log("✅ Check API Response:", checkData);

    let pushData = null;

    if (checkData.Status === 2 && checkData.Message === "User not found") {
      pushData = await sendToPushAPI(lead);
    }

    return {
      checkAPI: checkData,
      pushAPI: pushData,
    };
  } catch (error) {
    console.error("🚫 Check API Error:", error.message);
    return {
      checkAPI: {
        Status: 0,
        Error:
          error.response?.data?.Error ||
          error.response?.statusText ||
          "Unknown Check API error",
      },
      pushAPI: null,
    };
  }
}

async function sendToPushAPI(lead) {
  try {
    const payload = {
      full_name: lead.name,
      email: lead.email || "",
      mobile: lead.phone,
      pancard: lead.pan,
      pincode: lead.pincode || "",
      income_type: lead.income || "",
      loan_amount: loanAmount,
      partner_id: partner_id,
    };

    console.log("📤 Sending to Push API:", payload);

    const response = await axios.post(secondAPI, payload, {
      headers: getHeaders(),
    });

    console.log("✅ Push API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("🚫 Push API Failed:", error.message);
    return {
      Status: 0,
      Error:
        error.response?.data?.Error ||
        error.response?.statusText ||
        "Unknown Push API error",
    };
  }
}

async function processBatch(users) {
  const promises = users.map((user) => sendToNewAPI(user));
  const results = await Promise.all(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    console.log(`📦 Updating DB for ${user.phone} with response:`, response);

    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              rupee112: response.checkAPI,
              rupee112Push: response.pushAPI,
              Status: response.checkAPI.Status,
              message:
                response.checkAPI.Message || response.checkAPI.Error || "",
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "BharatLoan",
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
          "RefArr.name": { $ne: "BharatLoan" },
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

async function main() {
  try {
    await mongoose.connect(MONGODB_URIVISH);
    console.log("✅ MongoDB Connected Successfully");
    await loop();
  } catch (err) {
    console.error("🚫 MongoDB Connection Error:", err);
    process.exit(1);
  }
}

main();
