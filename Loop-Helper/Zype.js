const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

// Load the MongoDB connection string from environment variables
const MONGODB_URINEW = process.env.MONGODB_URINEW;

// Establish a connection to MongoDB
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// Define a Mongoose model for the 'smcoll' collection
// This schema is set to be 'strict: false' to handle flexible document structures
const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

// Constants for batch size and API details
const BATCH_SIZE = 100;
const PartnerID = "a8ce06a0-4fbd-489f-8d75-345548fb98a8";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

/**
 * Ensures the user's income is a number.
 * @param {object} user - The user document.
 */
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

/**
 * Sends a request to the customer eligibility API.
 * @param {object} user - The user document.
 * @returns {Promise<object>} The API response data or a failure object.
 */
async function sendToNewAPI(user) {
  try {
    // Process the income field before sending the request
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

/**
 * Sends a request to the pre-approval API, but only for 'Salaried' users.
 * @param {object} user - The user document.
 * @returns {Promise<object|void>} The API response data or undefined if skipped.
 */
async function getPreApproval(user) {
  // Skip if the user is not 'Salaried'
  if (user.employment !== "Salaried") {
    const reason = `Employment type is '${user.employment}' — skipped preApproval`;
    console.log(`⏭️ Skipping PreApproval: ${reason}`);

    // Update the database to reflect that this step was skipped
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

/**
 * Processes a batch of users concurrently.
 * @param {Array<object>} users - An array of user documents.
 */
async function processBatch(users) {
  const results = await Promise.allSettled(
    users.map(async (user) => {
      // Find the user document to check for existing data and update
      const userDoc = await UserDB.findOne({ phone: user.phone });
      const updates = {};
      let needUpdate = false;

      // Ensure apiResponse and preApproval fields are arrays if they exist
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

      // 🚫 SKIP if not Salaried
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

      // ✅ Send Eligibility API
      const eligibilityResponse = await sendToNewAPI(user);

      // Define the update document
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

      // If eligibility is 'ACCEPT', proceed with pre-approval
      if (eligibilityResponse.status === "ACCEPT") {
        const preApprovalResponse = await getPreApproval(user);

        if (preApprovalResponse) {
          // Push pre-approval data to the apiResponse array
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

      // Update the user document in the database
      await UserDB.updateOne({ phone: user.phone }, updateDoc);
    }),
  );

  // Log the results of the batch processing
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Error processing user at index ${index}:`, result.reason);
    } else {
      console.log(`✅ Successfully processed user at index ${index}`);
    }
  });
}

/**
 * Main loop to fetch and process users in batches.
 */
async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");

      // Aggregate query to find users not yet processed by 'Zype'
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

// Start the main loop
Loop();
