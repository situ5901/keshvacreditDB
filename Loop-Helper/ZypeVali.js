const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "situ",
  new mongoose.Schema({}, { collection: "situ", strict: false }),
);

const MAX_PROCESS = 50000;
const BATCH_SIZE = 1;
const Campaign_name = "Keshvacredit_3";
const PartnerID = "92a87d42-ca67-49c8-a004-79dc8f86fc44";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

function validateUser(user) {
  const result = { passed: true, reasons: [] };
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

    console.log("\n📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Eligibility API Response:", response.data);
    return response.data;
  } catch (err) {
    console.log(
      "❌ Eligibility API Error Response:",
      err.response?.data || err.message,
    );
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

    console.log("\n📤 Sending Pre-Approval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Pre-Approval API Response:", response.data);
    return response.data;
  } catch (err) {
    console.log(
      "❌ Pre-Approval API Error Response:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      console.log(`\n🔍 Processing phone: ${user.phone}`);

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
      const validationStatus = validation.passed ? "PASSED" : "FAILED";
      const validationMessage =
        validation.reasons.join(", ") || "Validation Passed";

      const logBase = {
        ZypeValidation: true,
        validationStatus,
        message: validationMessage,
        createdAt: new Date().toISOString(),
      };

      // log and continue if validation fails
      if (!validation.passed) {
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $addToSet: {
              apiResponse: { ...logBase, status: validationStatus },
              RefArr: { name: "ZypeVali", at: new Date() },
            },
            $set: { zypeProcessed: true },
          },
        );
        console.log(
          `⛔ Skipping ${user.phone} due to validation: ${validationMessage}`,
        );
        return;
      }

      // Eligibility API
      const response = await sendToNewAPI(user);

      await UserDB.updateOne(
        { phone: user.phone },
        {
          $addToSet: {
            apiResponse: {
              ...logBase,
              status: response.status,
              ZypeValiResponse: { ...response, Zype: true },
            },
            RefArr: { name: "ZypeVali", at: new Date() },
          },
          $unset: { accounts: "" },
        },
      );

      // Pre-Approval if ACCEPT
      if (response.status === "ACCEPT") {
        const preApproval = await getPreApproval(user);
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $addToSet: {
              apiResponse: {
                ZypeValiResponse: preApproval,
                status: preApproval.status,
                amount: preApproval.amount,
                message: preApproval.message,
                createdAt: new Date().toISOString(),
              },
              RefArr: { name: "ZypeVali", at: new Date() },
            },
          },
        );
      }

      // ✅ Mark lead as processed finally
      await UserDB.updateOne(
        { phone: user.phone },
        { $set: { zypeProcessed: true } },
      );
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

let processedCount = 0;

async function Loop() {
  try {
    while (processedCount < MAX_PROCESS) {
      const leads = await UserDB.aggregate([
        {
          $match: {
            zypeProcessed: { $ne: true },
            phone: { $exists: true, $ne: null },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ No more leads to process. Exiting...");
        break;
      }

      const remaining = MAX_PROCESS - processedCount;
      const batchToProcess = leads.slice(0, remaining);

      await processBatch(batchToProcess);

      processedCount += batchToProcess.length;
      console.log(`✅ Processed batch of: ${batchToProcess.length}`);
      console.log(`🏁 Total Processed Leads: ${processedCount}`);

      if (processedCount >= MAX_PROCESS) {
        console.log("🎯 Reached max limit. Done!");
        break;
      }
    }
  } catch (error) {
    console.error("❌ Error occurred during processing:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
