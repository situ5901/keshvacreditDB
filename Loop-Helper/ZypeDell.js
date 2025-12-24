const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.COVER_VISHU;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "dell",
  new mongoose.Schema({}, { collection: "dell", strict: false }),
);

const BATCH_SIZE = 300;
const PartnerID = "1e7c776d-752e-4604-baba-aacd1ce1fe7a";
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

function convertUtcToIsoDob(utcDate) {
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid UTC Date");
    }
    return date.toISOString().split("T")[0]; // Sirf YYYY-MM-DD (DOB ke liye)
  } catch (err) {
    console.error("❌ DOB Conversion Error:", err.message);
    return null;
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
  if (user.employment !== "Salaried") {
    const reason = `Employment type is '${user.employment}' — skipped preApproval`;
    console.log(`⏭️ Skipping PreApproval: ${reason}`);
    await UserDB.updateOne(
      { phone: user.phone },
      {
        $push: {
          RefArr: {
            name: "Zype",
            message: reason,
            createdAt: new Date().toISOString(),
          },
        },
      },
    );

    return;
  }

  try {
    const payload = {
      mobileNumber: String(user.phone),
      email: user.email,
      panNumber: user.pan,
      name: user.name,
      dob: convertUtcToIsoDob(user.dob),
      income: user.income,
      employmentType: user.employment,
      orgName: "Infosys Ltd",
      partnerId: PartnerID,
      bureauType: 3,
      bureauName: "experian",
      bureauData: JSON.stringify({ score: 765, reportDate: "2025-03-20" }),
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

      if (user.employment !== "Salaried") {
        const skipMessage = `Employment type is '${user.employment}' — skipped eligibility & preApproval`;
        console.log(`⏭️ ${skipMessage}: ${user.phone} - ${user.name}`);

        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "Zype",
                message: skipMessage,
                createdAt: new Date().toISOString(),
              },
            },
          },
        );

        return; // Stop processing this user
      }

      const eligibilityResponse = await sendToNewAPI(user);

      const updateDoc = {
        $push: {
          apiResponse: {
            ZypeResponse: {
              ...eligibilityResponse,
              Zype: true,
            },
            status: eligibilityResponse.status,
            amount: eligibilityResponse.amount,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "Zype",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" }, // Unset the 'accounts' field
      };

      if (eligibilityResponse.status === "ACCEPT") {
        const preApprovalResponse = await getPreApproval(user);

        if (preApprovalResponse) {
          updateDoc.$push.apiResponse = {
            ZypeResponse: preApprovalResponse,
            status: preApprovalResponse.status,
            amount: preApprovalResponse.amount,
            message: preApprovalResponse.message,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        console.log(
          `⛔ No PreApproval — Status: ${eligibilityResponse.status}`,
        );
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

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "Zype" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ No more leads left. Stopping.");
        break;
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
