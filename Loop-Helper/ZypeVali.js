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
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

function isValidUser(user) {
  const salary = Number(user.income);
  const tradelinePL = Number(user.personalLoanAmount || 0);
  const creditCardLimit = Number(user.creditCardLimit || 0);
  const location = user.location?.toLowerCase() || "";
  const employerCategory = String(user.employerCategory || "").toUpperCase();

  if (salary < 50000) return { valid: false, reason: "Income below 50k" };
  if (tradelinePL <= 100000 && creditCardLimit <= 100000)
    return { valid: false, reason: "No serious tradeline" };
  if (location !== "tier a")
    return { valid: false, reason: "Location not Tier A" };
  if (!["A", "B", "C"].includes(employerCategory))
    return { valid: false, reason: "Invalid Employer Category" };

  return { valid: true };
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

      const validation = isValidUser(user);
      if (!validation.valid) {
        console.log(`⛔ Skipping user ${user.phone} - ${validation.reason}`);
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "ZypeValidation",
                reason: validation.reason,
                createdAt: new Date().toISOString(),
              },
            },
            $unset: { accounts: "" },
          },
        );
        return;
      }

      const response = await sendToNewAPI(user);
      console.log(
        `📋 User: ${user.phone}, Eligibility API Response:`,
        response,
      );

      const updateDoc = {
        $push: {
          apiResponse: {
            ZypeResponse: {
              ...response,
              Zype: true,
            },
            status: response.status,
            amount: response.amount,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "ZypeValidation",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      if (response.status === "ACCEPT") {
        const preApproval = await getPreApproval(user);
        console.log(
          `📋 User: ${user.phone}, PreApproval API Response:`,
          preApproval,
        );

        updateDoc.$push.apiResponse = {
          ZypeResponse: preApproval,
          status: preApproval.status,
          amount: preApproval.amount,
          message: preApproval.message,
          createdAt: new Date().toISOString(),
        };
      } else {
        console.log(`⛔ No PreApproval — Status: ${response.status}`);
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
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "ZypeValidation" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ No more leads left. Waiting for new data...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        continue;
      }

      const remaining = MAX_PROCESS - processedCount;
      const batchToProcess = leads.slice(0, remaining);

      await processBatch(batchToProcess);

      processedCount += batchToProcess.length;
      console.log(`✅ Processed batch of: ${batchToProcess.length}`);
      console.log(`🏁 Total Processed Leads: ${processedCount}`);

      if (processedCount >= MAX_PROCESS) {
        console.log("🎯 Reached processing limit of 50,000 records. Stopping.");
        break;
      }

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
