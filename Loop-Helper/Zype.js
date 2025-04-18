const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
);

const BATCH_SIZE = 10;
const MAX_LEADS = 50000;
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";

const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

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

// Pre-Approval API
async function getPreApproval(user) {
  try {
    const payload = {
      mobileNumber: String(user.phone),
      email: user.email,
      panNumber: user.pan,
      name: user.name,
      dob: user.dob,
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

async function processBatch(users) {
  for (let user of users) {
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
          fullResponse: {
            ...response,
            Zype: true,
          },
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

    if (response.status === "ACCEPT") {
      const preApproval = await getPreApproval(user);

      updateDoc.$push.apiResponse = {
        fullResponse: preApproval,
        status: preApproval.status,
        amount: preApproval.amount,
        message: preApproval.message,
        createdAt: new Date().toISOString(),
      };
    } else {
      console.log(`⛔ No PreApproval — Status: ${response.status}`);
    }

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
  }
}

async function Loop() {
  try {
    while (true) {
      // Infinite loop — jab tak manually band na karo ya DB empty na ho
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "Zype" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ No more leads left. Waiting for new data...");
        // 5 second ka wait, fir dobara try karega
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      await processBatch(leads);
      console.log(`✅ Processed batch of: ${leads.length}`);

      // 1 sec ka delay har batch ke baad
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
