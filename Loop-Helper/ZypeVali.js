const mongoose = require("mongoose");
const axios = require("axios");
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

const MAX_PROCESS = 50000;
const BATCH_SIZE = 100;
const Campaign_name = "Keshvacredit_3";
const PartnerID = "92a87d42-ca67-49c8-a004-79dc8f86fc44";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

function validateUser(user) {
  const result = {
    passed: true,
    reasons: [],
  };

  if (user.income <= 50000) {
    result.passed = false;
    result.reasons.push("Income should be => ₹50,000");
  }

  const tierAStates = [
    "Delhi",
    "Mumbai",
    "Bangalore",
    "Chennai",
    "Kolkata",
    "Hyderabad",
    "Pune",
  ];

  if (!tierAStates.includes(user.state)) {
    result.passed = false;
    result.reasons.push("Invalid Location");
  }

  const employmentMap = {
    salaried: "A",
    "self-employed": "B",
    none: "C",
  };

  const rawEmployment = user.employment?.toString().trim().toLowerCase();
  const empCode = employmentMap[rawEmployment];

  if (!["A", "B", "C"].includes(empCode)) {
    result.passed = false;
    result.reasons.push("Invalid Employer Category");
  }

  return result;
}

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
      campaignName: Campaign_name,
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
      campaignName: Campaign_name,
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

      const validation = validateUser(user);

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              ZypeValidation: true,
              validationStatus: validation.passed ? "PASSED" : "FAILED",
              message: validation.reasons.join(", ") || "Validation Passed",
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "ZypeVali",
              type: "Validation",
              status: validation.passed ? "PASSED" : "FAILED",
              createdAt: new Date().toISOString(),
            },
          },
        },
      );

      if (!validation.passed) {
        console.log(
          `⛔ Skipping API for ${user.phone} due to validation failure: ${validation.reasons.join(", ")}`,
        );
        return;
      }

      const response = await sendToNewAPI(user);

      const updateDoc = {
        $push: {
          apiResponse: {
            ZypeValiResponse: {
              ...response,
              Zype: true,
            },
            status: response.status,
            amount: response.amount || null,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "ZypeVali",
            type: "Eligibility",
            status: response.status,
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      if (response.status === "ACCEPT") {
        const preApproval = await getPreApproval(user);
        updateDoc.$push.apiResponse = {
          ZypeValiResponse: preApproval,
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
      console.error(`Error processing user at index ${index}:`, result.reason);
    } else {
      console.log(`✅ Successfully processed user at index ${index}`);
    }
  });
}

let processedCount = 0;

async function Loop() {
  try {
    while (processedCount < MAX_PROCESS) {
      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "ZypeVali" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ No more leads. Waiting...");
        continue;
      }

      const remaining = MAX_PROCESS - processedCount;
      const batchToProcess = leads.slice(0, remaining);

      await processBatch(batchToProcess);

      processedCount += batchToProcess.length;
      console.log(`✅ Processed batch of: ${batchToProcess.length}`);
      console.log(`🏁 Total Processed Leads: ${processedCount}`);

      if (processedCount >= MAX_PROCESS) {
        console.log("🎯 Reached processing limit. Stopping.");
        break;
      }
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
