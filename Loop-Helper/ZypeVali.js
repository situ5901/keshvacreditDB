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
const BATCH_SIZE = 1; // You can adjust this based on your needs for concurrency
const Campaign_name = "Keshvacredit_3";
const PartnerID = "92a87d42-ca67-49c8-a004-79dc8f86fc44";
const ELIGIBILITY_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/customerEligibility";
const PRE_APPROVAL_API =
  "https://prod.zype.co.in/attribution-service/api/v1/underwriting/preApprovalOffer";

function validateUser(user) {
  const result = { passed: true, reasons: [] };

  if (!user.income || typeof user.income === "undefined") {
    result.passed = false;
    result.reasons.push("Income is missing or undefined.");
  } else {
    // Attempt to convert income to a number if it's a string
    let parsedIncome =
      typeof user.income === "string" ? parseFloat(user.income) : user.income;

    if (isNaN(parsedIncome) || parsedIncome <= 50000) {
      result.passed = false;
      result.reasons.push("Income should be a number and => ₹50,000");
    }
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

  if (!user.state || !tierAStates.includes(user.state)) {
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

  if (!rawEmployment || !["A", "B", "C"].includes(empCode)) {
    result.passed = false;
    result.reasons.push("Invalid Employer Category");
  }

  // Basic checks for required fields for the APIs
  if (!user.phone) {
    result.passed = false;
    result.reasons.push("Phone number is missing.");
  }
  if (!user.pan) {
    result.passed = false;
    result.reasons.push("PAN number is missing.");
  }
  if (!user.email) {
    result.passed = false;
    result.reasons.push("Email is missing.");
  }
  if (!user.name) {
    result.passed = false;
    result.reasons.push("Name is missing.");
  }
  if (!user.dob) {
    result.passed = false;
    result.reasons.push("Date of birth is missing.");
  }

  return result;
}

// Helper function to process income to ensure it's a number
async function processIncome(user) {
  if (typeof user.income === "string") {
    const parsedIncome = parseFloat(user.income);
    if (!isNaN(parsedIncome)) {
      user.income = parsedIncome;
    } else {
      throw new Error("INCOME_SHOULD_BE_NUMBER"); // Or handle as a validation failure
    }
  }
}

async function sendToNewAPI(user) {
  try {
    await processIncome(user); // Ensure income is a number
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
    await processIncome(user); // Ensure income is a number
    const payload = {
      mobileNumber: String(user.phone),
      email: user.email,
      panNumber: user.pan,
      name: user.name,
      dob: user.dob,
      income: user.income,
      employmentType: user.employment,
      orgName: "Infosys Ltd", // You might want to make this dynamic if available in user data
      partnerId: PartnerID,
      campaignName: Campaign_name,
      bureauType: 1,
      bureauName: "experian",
      bureauData: JSON.stringify({ score: 765, reportDate: "2024-03-20" }), // Make dynamic if actual bureau data is available
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
  let successCount = 0;

  await Promise.allSettled(
    users.map(async (user) => {
      let apiResponseEntry = {
        ZypeValidation: {},
        status: "SKIPPED",
        message: "Skipped due to prior processing or validation issues",
        createdAt: new Date().toISOString(),
      };

      try {
        // Skip if already processed for ZypeVAli5901
        if (user.RefArr && user.RefArr.some((r) => r.name === "ZypeVAli5901")) {
          console.log(
            `Skipping user ${user.phone} - already processed for Zype Validation.`,
          );
          // We still want to update the apiResponse for consistency if it was somehow missed,
          // though the primary purpose of this block is to avoid redundant API calls.
          await UserDB.updateOne(
            { phone: user.phone },
            {
              $push: {
                apiResponse: {
                  ZypeValidation: {
                    eligibility: {
                      status: "SKIPPED",
                      message: "Already processed for Zype Validation",
                    },
                    preApproval: {
                      status: "SKIPPED",
                      message: "Already processed for Zype Validation",
                    },
                  },
                  status: "SKIPPED",
                  message: "Already processed for Zype Validation",
                  createdAt: new Date().toISOString(),
                },
              },
            },
          );
          return;
        }

        const userValidity = validateUser(user);
        if (!userValidity.passed) {
          const reason = `Validation failed: ${userValidity.reasons.join(", ")}`;
          apiResponseEntry.message = reason;
          await UserDB.updateOne(
            { phone: user.phone },
            {
              $push: {
                RefArr: {
                  name: "SkippedZypeValidation",
                  reason,
                  createdAt: new Date().toISOString(),
                },
                apiResponse: apiResponseEntry,
              },
            },
          );
          console.log(`Skipping user ${user.phone} - ${reason}`);
          return;
        }

        const eligibilityResponse = await sendToNewAPI(user);
        apiResponseEntry.ZypeValidation.eligibility = eligibilityResponse;

        if (eligibilityResponse.status === "SUCCESS") {
          const preApprovalResponse = await getPreApproval(user);
          apiResponseEntry.ZypeValidation.preApproval = preApprovalResponse;
          apiResponseEntry.status = preApprovalResponse.status || "FAILED";
          apiResponseEntry.message = preApprovalResponse.message || "";

          if (preApprovalResponse.status === "SUCCESS") {
            successCount += 1;
          }
        } else {
          apiResponseEntry.status = eligibilityResponse.status || "FAILED";
          apiResponseEntry.message = eligibilityResponse.message || "";
        }

        // Update the user document with the API responses and mark as processed
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: { apiResponse: apiResponseEntry },
            $addToSet: {
              RefArr: {
                name: "ZypeVAli5901",
                createdAt: new Date().toISOString(),
              },
            },
          },
        );
      } catch (error) {
        const errorMessage = `Unexpected error during Zype API processing: ${error.message}`;
        apiResponseEntry.message = errorMessage;
        apiResponseEntry.status = "ERROR";
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "SkippedZypeValidationWithError",
                reason: errorMessage,
                createdAt: new Date().toISOString(),
              },
              apiResponse: apiResponseEntry,
            },
          },
        );
        console.error(`❌ Error processing user ${user.phone}:`, error);
      }
    }),
  );

  return successCount;
}

async function Loop() {
  let successLeads = 0;

  try {
    while (successLeads < MAX_PROCESS) {
      console.log(`Fetching leads... Current success leads: ${successLeads}`);

      const leads = await UserDB.aggregate([
        {
          $match: {
            // Only fetch leads that have NOT been processed by ZypeVAli5901
            "RefArr.name": { $ne: "ZypeVAli5901" },
            // Also exclude leads that were skipped due to ZypeValidation issues or errors
            "RefArr.name": {
              $nin: ["SkippedZypeValidation", "SkippedZypeValidationWithError"],
            },
          },
        },
        { $limit: BATCH_SIZE * 2 }, // Fetch a bit more than BATCH_SIZE to account for local filtering
      ]);

      if (!leads.length) {
        console.log(
          "No more leads to process or all leads have been processed.",
        );
        break;
      }

      const validLeads = leads.filter((user) => {
        const userValidity = validateUser(user);
        if (!userValidity.passed) {
          console.log(
            `User ${user.phone} failed initial validation: ${userValidity.reasons.join(", ")}. Will be skipped.`,
          );
        }
        return userValidity.passed;
      });

      if (!validLeads.length) {
        console.log(
          "No valid leads found in the current batch after initial filtering.",
        );
        if (leads.length < BATCH_SIZE * 2) {
          break;
        }
        await new Promise((resolve) => setImmediate(resolve));
        continue;
      }

      const remainingSlots = MAX_PROCESS - successLeads;
      const batchToProcess = validLeads.slice(
        0,
        Math.min(validLeads.length, remainingSlots),
      );

      if (batchToProcess.length === 0) {
        console.log("No leads left to process to reach MAX_PROCESS.");
        break;
      }

      console.log(`Processing batch of ${batchToProcess.length} leads.`);
      const batchSuccess = await processBatch(batchToProcess);
      successLeads += batchSuccess;

      console.log(`Batch processed. Total successful leads: ${successLeads}`);

      if (successLeads >= MAX_PROCESS) {
        console.log(`Reached MAX_PROCESS of ${MAX_PROCESS} successful leads.`);
        break;
      }

      // Small delay to avoid overwhelming the database/APIs
      await new Promise((resolve) => setImmediate(resolve));
    }
  } catch (error) {
    console.error("Unhandled error in main Loop:", error);
  } finally {
    console.log("Disconnecting MongoDB.");
    mongoose.disconnect();
  }
}

Loop();
