const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;
const MAX_PROCESS = 10;
const BATCH_SIZE = 1;

const Token_API = "https://atlas.whizdm.com/atlas/v1/token";
const LEAD_API = "https://atlas.whizdm.com/atlas/v1/leads";

// MongoDB connection
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("🚫 MongoDB Connection Error:", err);
    process.exit(1);
  });

const UserDB = mongoose.model(
  "Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
);

// Get new token
async function getToken() {
  try {
    const response = await axios.post(Token_API, {
      userName: "keshvacredit",
      password: "Zb'91O(Nhy",
      partnerCode: 422,
    });
    return response.data.token;
  } catch (error) {
    console.error(
      "❌ Error Fetching Token:",
      error.response?.data || error.message,
    );
    return null;
  }
}

// Send lead to MoneyView
async function sendToMoneyView(lead, token) {
  const requestBody = {
    partnerCode: 422,
    partnerRef: "Keshvacredit",
    phone: lead.phone,
    pan: lead.pan,
    name: lead.name,
    gender: lead.gender,
    dateOfBirth: lead.dateOfBirth,
    employmentType: lead.employmentType,
    declaredIncome: lead.declaredIncome,
  };

  console.log("📤 Sending Lead:", JSON.stringify(requestBody, null, 2));

  try {
    const res = await axios.post(LEAD_API, requestBody, {
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    console.log("✅ API Response:", JSON.stringify(res.data, null, 2));
    return {
      status: res.status,
      msg: res.data.msg || "Success",
      full: res.data,
    };
  } catch (error) {
    console.error(
      "❌ API Error Response:",
      error.response?.data || error.message,
    );
    return {
      status: "failed",
      msg: error.response?.data?.msg || error.message,
      full: error.response?.data || {},
    };
  }
}

// Process one user
async function processUser(user) {
  const token = await getToken();
  if (!token) {
    console.error(`❌ Token not generated for ${user.phone}`);
    return;
  }

  const response = await sendToMoneyView(user, token);

  await UserDB.updateOne(
    { phone: user.phone },
    {
      $push: {
        apiResponse: {
          MoneyViewResponse: {
            ...response,
            MoneyView: true,
          },
          status: response.status,
          createdAt: new Date(),
        },
      },
    },
    { upsert: true },
  );

  console.log(
    `✅ Processed user ${user.phone} with status: ${response.status}`,
  );
}

// Main loop
async function mainLoop() {
  let processedCount = 0;

  try {
    while (processedCount < MAX_PROCESS) {
      console.log("📦 Fetching leads from DB...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            $or: [
              { apiResponse: { $exists: false } },
              { "apiResponse.MoneyViewResponse.MoneyView": { $ne: true } },
            ],
            phone: { $ne: null },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("⛔ No more leads to process.");
        break;
      }

      for (const lead of leads) {
        await processUser(lead);
        processedCount++;
        if (processedCount >= MAX_PROCESS) break;
      }
    }
  } catch (err) {
    console.error("❌ Error occurred:", err);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

mainLoop();
