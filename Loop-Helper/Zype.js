const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// Schema
const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const BATCH_SIZE = 10;
const MAX_LEADS = 10000;
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";

const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

// Function to check eligibility
async function sendToNewAPI(user) {
  try {
    const payload = {
      mobileNumber: user.phone,
      panNumber: user.pan,
      partnerId: PartnerID,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("📩 Eligibility Response:", response.data);
    return {
      status: response.data.status,
      message: response.data.message,
    };
  } catch (err) {
    const errorMsg =
      err.response?.data?.message || err.message || "Unknown Error";
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    return { status: "FAILED", message: errorMsg };
  }
}

async function getPreApproval(user) {
  try {
    const payload = {
      mobileNumber: user.phone,
      email: user.email,
      panNumber: user.pan,
      name: user.name,
      dob: user.dob,
      income: user.income,
      employmentType: user.employment,
      orgName: "TCS Ltd",
      partnerId: PartnerID,
      bureauType: 1,
      bureauName: "experian",
      bureauData: JSON.stringify({ score: 765, reportDate: "2024-03-20" }),
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return { status: "FAILED", message: err.message };
  }
}

async function processBatch(users) {
  for (let user of users) {
    const userDoc = await UserDB.findOne({ phone: user.phone });

    // ✅ Skip if already processed with Zype
    if (userDoc?.RefArr?.some((ref) => ref.name === "Zype")) {
      console.log(`⏭️ Skipping ${user.phone} as Zype is already present`);
      continue;
    }

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

    // ✅ Step 1: Hit Eligibility API
    const response = await sendToNewAPI(user);

    const updateDoc = {
      $push: {
        apiResponse: {
          Zype: true,
          status: response.status,
          amount: response.amount,
          message: response.message,
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "Zype",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    // ✅ Step 2: If accepted, hit PreApproval API
    if (response.status === "ACCEPTED") {
      const preApproval = await getPreApproval(user);

      updateDoc.$push.preApproval = {
        fullResponse: preApproval,
        status: preApproval.status,
        message: preApproval.message,
        amount: preApproval.amount,
        createdAt: new Date().toISOString(),
      };

      console.log("🎯 PreApproval Offer:", preApproval);
    } else {
      console.log(`⛔ Skipping PreApproval for ${user.phone}`);
    }

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
  }
}
// Loop to process all leads in batches
async function Loop() {
  let processedCount = 0;
  let hasMoreLeads = true;

  try {
    while (hasMoreLeads && processedCount < MAX_LEADS) {
      console.log("🔄 Fetching leads...");

      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "Zype" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;

        console.log(`📊 Total Processed: ${processedCount}`);

        if (processedCount >= MAX_LEADS) {
          console.log("✅ Limit reached. Ending process.");
          hasMoreLeads = false;
        } else {
          console.log("⏳ Waiting 5 seconds before next batch...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

// Start the process
Loop();
