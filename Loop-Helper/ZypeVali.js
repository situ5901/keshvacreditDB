const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "zypeimp",
  new mongoose.Schema({}, { collection: "zypeimp", strict: false }),
);

const BATCH_SIZE = 100;
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

async function processIncome(user) {
  if (typeof user.income === "string") {
    const parsedIncome = parseFloat(String(user.income).trim());
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

    console.log(
      "✅ Eligibility Response:",
      JSON.stringify(response.data, null, 2),
    );
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

    console.log(
      "✅ PreApproval Response:",
      JSON.stringify(response.data, null, 2),
    );
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
      if (!userDoc) {
        console.warn(`⚠️ User not found in DB for phone: ${user.phone}`);
        return;
      }

      if (
        userDoc.RefArr &&
        userDoc.RefArr.some((item) => item.name === "Zypevali")
      ) {
        return;
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

      if (!user.phone || !user.pan || !user.income) {
        console.warn(`⚠️ Missing essential fields for user: ${user.phone}`);
        return;
      }

      const response = await sendToNewAPI(user);

      const baseApiEntry = {
        ZypeResponse: { ...response, Zype: true },
        status: response.status,
        amount: response.amount,
        createdAt: new Date().toISOString(),
      };

      const refArrEntry = {
        name: "Zypevali", // ✅ Consistent name
        createdAt: new Date().toISOString(),
      };

      const updateDoc = {
        $push: {
          apiResponse: { $each: [baseApiEntry] },
          RefArr: refArrEntry,
        },
        $unset: { accounts: "" },
      };

      if (response.status === "ACCEPT") {
        const allowedStates = [
          "Delhi",
          "Mumbai",
          "Bangalore",
          "Chennai",
          "Kolkata",
          "Hyderabad",
          "Pune",
        ];
        const state = (user.state || "").trim();

        if (user.income >= 50000 && allowedStates.includes(state)) {
          const preApproval = await getPreApproval(user);
          const preApprovalEntry = {
            ZypeResponse: preApproval,
            status: preApproval.status,
            amount: preApproval.amount,
            message: preApproval.message,
            createdAt: new Date().toISOString(),
          };
          updateDoc.$push.apiResponse.$each.push(preApprovalEntry);
        } else {
          const failEntry = {
            ZypeResponse: {
              status: "VALIDATION_FAILED",
              message: "Income or Location not eligible for PreApproval",
            },
            status: "VALIDATION_FAILED",
            createdAt: new Date().toISOString(),
          };
          updateDoc.$push.apiResponse.$each.push(failEntry);
        }
      } else {
        console.log(`⛔ No PreApproval — Status: ${response.status}`);
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

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Zypevali" }, // ✅ Match consistent name
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("🎉 All leads with no 'Zypevali' RefArr are processed!");
        break;
      }

      console.log(`🔁 Processing batch of ${leads.length} users...`);
      await processBatch(leads);

      await new Promise((resolve) => setTimeout(resolve, 1000)); // delay between batches
    }
  } catch (error) {
    console.error("❌ Error occurred in Loop:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
