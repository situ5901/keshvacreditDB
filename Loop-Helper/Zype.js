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

const BATCH_SIZE = 5;
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

// Utility: Delay Function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Process income
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

// Send Eligibility API
async function sendToNewAPI(user) {
  try {
    await processIncome(user);

    const payload = {
      mobileNumber: String(user.phone),
      panNumber: user.pan,
      partnerId: PartnerID,
    };

    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (err) {
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Send PreApproval API
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

    const response = await axios.post(PRE_APPROVAL_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (err) {
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Process each user in the batch
async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      const userDoc = await UserDB.findOne({ phone: user.phone });
      const updates = {};
      let needUpdate = false;

      if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse)) {
        updates.apiResponse = [userDoc.apiResponse];
        needUpdate = true;
      }

      if (userDoc.preApproval && !Array.isArray(userDoc.preApproval)) {
        updates.preApproval = [userDoc.preApproval];
        needUpdate = true;
      }

      if (needUpdate) {
        await UserDB.updateOne({ phone: user.phone }, { $set: updates });
      }

      const response = await sendToNewAPI(user);

      const updateDoc = {
        $push: {
          apiResponse: {
            ZypeResponse: { ...response, Zype: true },
            status: response.status,
            amount: response.amount,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "Zype",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      if (response.status === "ACCEPT") {
        const preApproval = await getPreApproval(user);
        updateDoc.$push.apiResponse = {
          ZypeResponse: preApproval,
          status: preApproval.status,
          amount: preApproval.amount,
          message: preApproval.message,
          createdAt: new Date().toISOString(),
        };
      }

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `❌ Error processing user at index ${index}:`,
        result.reason,
      );
    } else {
      console.log(`✅ Successfully processed user at index ${index}`);
    }
  });
}

// Main Loop
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
        console.log("🕒 No more leads. Waiting for new data...");
        await delay(5000); // Wait 5 seconds
        continue;
      }

      await processBatch(leads);
      console.log(`✅ Processed batch of: ${leads.length}`);
    }
  } catch (error) {
    console.error("❌ Loop Error:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
