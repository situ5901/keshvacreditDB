const express = require("express");
const app = express();
const mongoose = require("mongoose");
const axios = require("axios");

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);
// Constants
const BATCH_SIZE = 100;
const TOKEN_API_URL = "https://vnotificationgw.uat.pointz.in/v1/auth/token";
const LEAD_CREATE_API_URL =
  "https://vnotificationgw.uat.pointz.in/v1/leads/loans/create";

/**
 * Generates an authentication token from the Epifi token API.
 * @returns {Promise<string|null>} The auth token if successful, otherwise null.
 */
async function sendToToken() {
  try {
    const payload = {
      client_id: "keshvacredit",
      client_secret: "keshvacredit",
    };

    const response = await axios.post(TOKEN_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        // This Basic Authorization header seems specific to your setup, ensure it's correct as per Epifi's documentation if different
        Authorization: "Basic cmFtZXM6cmFtZXM=",
      },
    });

    // Check the response structure based on the provided Epifi documentation
    if (response.data.status && response.data.status.code === 0) {
      console.log("✅ Token generated successfully:", response.data.auth_token);
      return response.data.auth_token;
    } else {
      console.error(
        "❌ Error generating token:",
        response.data.status ? response.data.status.message : "Unknown error",
      );
      return null;
    }
  } catch (error) {
    console.error(
      "❌ Token generation failed:",
      error.response ? error.response.data : error.message,
    );
    return null;
  }
}

/**
 * Sends a lead's data to the Epifi Create Loan Lead API.
 * @param {object} lead - The lead object containing user data.
 * @param {string} token - The authentication token.
 * @returns {Promise<object>} The response data from the Lead API.
 * @throws {Error} If the API call fails.
 */
async function LeadAPIs(lead, token) {
  try {
    const payload = {
      client_request_id: lead._id
        ? lead._id.toString()
        : `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`, // Use MongoDB _id as client_request_id or generate a unique one
      name: {
        first: lead.name,
        // middle: lead.middleName, // Optional, add if available in your lead data
        last: lead.lastName || "Doe", // Assuming a last name is mandatory, provide a default or handle missing
      },
      phone_number: lead.phone,
      email: lead.email,
      pan: lead.pan,
      dob: lead.dob, // Ensure DOB is in YYYY-MM-DD format
      current_address: {
        pincode: lead.pincode,
      },
      employment_details: {
        employment_type: lead.employment,
        monthly_income: String(lead.income), // Ensure monthly_income is a string
      },
      loan_requirement: {
        desired_loan_amount: String(lead.desired_loan_amount || "500000"), // Ensure loan amount is a string
      },
      custom_fields: {}, // Populate if you have custom fields
      evaluation_type: "BASIC", // As per documentation, can be optional
    };

    const response = await axios.post(LEAD_CREATE_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("✅ Lead API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error in LeadAPIs:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

/**
 * Processes a batch of users, sending their data to the Lead API and updating the database.
 * @param {Array<object>} users - An array of user (lead) objects to process.
 * @param {string} token - The authentication token.
 */
async function processBatch(users, token) {
  await Promise.all(
    users.map(async (user) => {
      try {
        // Check if the user has already been processed (RefArr.name === "PI")
        // It's generally better to query the database once for existence to avoid race conditions
        // or rely on a unique identifier for atomicity. The current check with findOne is okay.
        const userDoc = await UserDB.findOne({ _id: user._id }); // Use _id for more precise check
        if (userDoc?.RefArr?.some((ref) => ref.name === "PI")) {
          console.log(`⚠️ Skipping ${user.phone} (already processed)`);
          return;
        }

        const leadResponse = await LeadAPIs(user, token);

        // Prepare the update document based on the Epifi API response structure
        const updateDoc = {
          $push: {
            apiResponse: {
              PI: leadResponse,
              // Map 'status' and 'message' based on Epifi's response structure
              status: leadResponse.status ? leadResponse.status.code : null,
              message: leadResponse.status
                ? leadResponse.status.message
                : "No status message",
              available_lender_types:
                leadResponse.available_lender_types || null,
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "PI",
              createdAt: new Date().toISOString(),
            },
          },
          // Assuming 'accounts' field should be removed after processing
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ _id: user._id }, updateDoc); // Update using _id
        console.log(`✅ DB updated for: ${user.phone}`);
      } catch (error) {
        console.error(
          `❌ Failed to process or update DB for ${user.phone}:`,
          error.message,
        );
        // Depending on the error, you might want to log it and skip to the next user,
        // or mark this lead for retry.
      }
    }),
  );
}

/**
 * The main loop function that continuously fetches and processes leads.
 */
async function Loop() {
  const token = await sendToToken();
  if (!token) {
    console.log("❌ Token missing. Aborting...");
    return; // Exit if token is not obtained
  }

  // Recursive function to process the next batch of leads
  async function processNextBatch() {
    try {
      console.log("\n🔎 Looking for new leads...");
      // Aggregate to find leads that haven't been processed by 'PI'
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "PI" } } },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("⏸️ No unprocessed leads. Retrying in 2 seconds...");
        return setTimeout(processNextBatch, 2000); // Retry after 2 seconds
      }

      await processBatch(leads, token);
      console.log(`✅ Processed batch of ${leads.length} users`);
      setImmediate(processNextBatch); // Process next batch immediately after current one is done
    } catch (err) {
      console.error("❌ Error in processing loop:", err.message);
      // If a token-related error or a general API error occurs in processBatch,
      // you might want to re-authenticate or handle it specifically.
      // For now, simply retry the entire process after a delay.
      return setTimeout(processNextBatch, 3000); // Retry after 3 seconds on error
    }
  }
  processNextBatch(); // Start the processing loop
}

// Start the application loop
Loop();
