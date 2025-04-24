const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const newAPI =
  "https://kamakshimoney.com/loanapply/kamakshimoney_api/lead_gen/api/v1/create_lead";
const MAX_LEADS = 5; // Limit of 5 leads per batch
const MAX_CONCURRENT_REQUESTS = 5; // Limit the number of concurrent API requests
const Partner_id = "Keshvacredit";
const loanAmount = "20000"; // Loan amount as a string

// Function to send a lead to the new API
async function sendToNewAPI(lead) {
  let response = {};
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      name: lead.name,
      email: lead.email,
      employeeType: lead.employment,
      dob: lead.dob,
      pancard: lead.pan,
      loanAmount: loanAmount,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Lead:", JSON.stringify(apiRequestBody, null, 2));

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
    });

    response.status = apiResponse.data.status;
    response.message = apiResponse.data.message;
  } catch (error) {
    response.status = "failed";
    response.message =
      error.response?.data?.message || "API did not return a valid response";

    if (error.response) {
      console.error("❌ API Error:", error.response.data);
    }
  }
  return response;
}

// Function to process users in batches with concurrency control
async function processBatch(users) {
  const promises = [];

  // Create promises for each user to send to the API
  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    // Check if the lead has already been processed
    const existingUser = await UserDB.findOne({ phone: user.phone });
    if (existingUser && existingUser.isSentToAPI) {
      console.log(`📞 ${user.phone} already processed, skipping...`);
      continue;
    }

    // Create request promise for each user
    const requestPromise = sendToNewAPI(user).then((response) => {
      console.log(`📞 ${user.phone} => 🧾`, response);
      return { user, response };
    });

    promises.push(requestPromise);

    // If the number of concurrent requests reaches the limit, wait for all of them to finish
    if (promises.length >= MAX_CONCURRENT_REQUESTS) {
      await Promise.all(promises); // Wait for all promises to resolve
      promises.length = 0; // Reset the promise array
    }
  }

  // Wait for any remaining promises after all users are processed
  if (promises.length > 0) {
    await Promise.all(promises);
  }

  // Update the database after processing the batch
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    const updateResponse = await UserDB.updateOne(
      { phone: user.phone },
      {
        $push: {
          apiResponse: {
            value: response.value,
            message: response.message,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "kamakshi",
            createdAt: new Date().toISOString(),
          },
        },
        $set: { processed: true, isSentToAPI: true }, // Mark as processed
        $unset: { accounts: "" },
      },
    );

    console.log(`✅ Mongo Updated: ${user.phone}`, updateResponse);
  }
}

// Main loop function to fetch leads and process them in batches
async function loop() {
  let processedCount = 0;
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching new leads...");

      // Fetch leads from MongoDB that have not been processed and not sent to the API
      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "kamakshi" },
            isSentToAPI: { $ne: true },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads); // Process the batch of leads
        processedCount += leads.length;
        console.log(`✅ Total Processed: ${processedCount}`);
      }
    }
  } catch (err) {
    console.error("🚨 Error in loop:", err.message);
  } finally {
    mongoose.connection.close(); // Close the MongoDB connection
  }
}

// Continuous loop to keep fetching and processing leads
async function continuousLoop() {
  while (true) {
    await loop(); // Run the loop continuously
    console.log("Processing next batch...");
  }
}

continuousLoop(); // Start continuous execution
