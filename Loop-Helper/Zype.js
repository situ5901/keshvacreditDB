const mongoose = require("mongoose");
const axios = require("axios");
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

const BATCH_SIZE = 50;
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

// Convert income to number if it's a string
async function processIncome(user) {
  if (typeof user.income === "string") {
    const parsedIncome = parseFloat(user.income);
    if (!isNaN(parsedIncome)) {
      user.income = parsedIncome;
    } else {
      throw new Error("INCOME_SHOULD_BE_NUMBER");
    }
  }
}

// Call Eligibility API
async function sendToNewAPI(user) {
  try {
    await processIncome(user);

    const payload = {
      mobileNumber: String(user.phone),
      panNumber: user.pan,
      partnerId: PartnerID,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Eligibility Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Call Pre-Approval API
async function getPreApproval(user) {
  try {
    const payload = {
      mobileNumber: String(user.phone),
      email: user.email,
      panNumber: user.pan,
      name: user.name,
      dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : null,
      income: user.income,
      employmentType: user.employment,
      orgName: "Infosys Ltd",
      partnerId: PartnerID,
      bureauType: 1,
      bureauName: "experian",
      bureauData: JSON.stringify({ score: 765, reportDate: "2024-03-20" }),
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ PreApproval Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Process a batch of users
async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        const userDoc = await UserDB.findOne({ phone: user.phone });
        const updates = {};

        if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse)) {
          updates.apiResponse = [userDoc.apiResponse];
        }
        if (userDoc.preApproval && !Array.isArray(userDoc.preApproval)) {
          updates.preApproval = [userDoc.preApproval];
        }

        if (Object.keys(updates).length) {
          await UserDB.updateOne({ phone: user.phone }, { $set: updates });
        }

        const eligibility = await sendToNewAPI(user);

        const updateDoc = {
          $push: {
            apiResponse: [
              {
                ZypeResponse: eligibility,
                status: eligibility.status,
                amount: eligibility.amount,
                createdAt: new Date().toISOString(),
              },
            ],
            RefArr: {
              name: "Zype",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        };
        await UserDB.updateOne({ phone: user.phone }, updateDoc);
      } catch (err) {
        console.error(`❌ Error processing user ${user.phone}:`, err.message);
      }
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Error processing user at index ${index}:`, result.reason);
    } else {
      console.log(`✅ Successfully processed user at index ${index}`);
    }
  });
}

// Main loop
async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Zype" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ No more leads left. Waiting 30 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds delay
        continue;
      }

      await processBatch(leads);
      console.log(`✅ Processed batch of: ${leads.length}`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
