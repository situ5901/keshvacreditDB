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

// Constants
const BATCH_SIZE = 1;
const MAX_LEADS = 2;
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
    return response.data;
  } catch (err) {
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    return { status: "FAILED", message: err.message };
  }
}

// Function to get pre-approval offer
async function getPreApproval(user) {
  try {
    const payload = {
      mobileNumber: user.phone,
      email: user.email,
      panNumber: user.pan,
      name: user.name,
      dob: user.dob,
      income: user.income || 100000,
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

// Process batch of users
async function processBatch(users) {
  for (let user of users) {
    const response = await sendToNewAPI(user);

    const updateDoc = {
      $push: {
        apiResponse: {
          status: response.status,
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

    // Only send to PreApproval API if eligible
    if (response.status === "ACCEPTED") {
      const preApproval = await getPreApproval(user);
      updateDoc.$push.preApproval = {
        status: preApproval.status,
        message: preApproval.message,
        createdAt: new Date().toISOString(),
      };
      console.log("🎯 PreApproval Offer:", preApproval);
    } else {
      console.log(`⛔ Skipping PreApproval for ${user.phone}`);
    }

    const updateResponse = await UserDB.updateOne(
      { phone: user.phone },
      updateDoc,
    );

    console.log(
      `✅ Updated ${user.phone} ->`,
      updateResponse.modifiedCount > 0 ? "Success" : "No Change",
    );
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
          await new Promise((resolve) => setTimeout(resolve, 5000));
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
