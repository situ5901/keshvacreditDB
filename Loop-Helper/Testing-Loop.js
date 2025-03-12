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
  new mongoose.Schema({}, { strict: false }),
);

const BATCH_SIZE = 1;
const newAPI = "http://localhost:3000/api/v1/loop/post-data"; // New API endpoint
const MAX_LEADS = 10;
const Partner_id = "RS";

let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const apiRequestBody = {
      phone: lead.phone,
      name: lead.name,
      pan: lead.pan,
      dob: lead.dob,
      income: lead.income || "30000",
      Partner_id : Partner_id,
    };

    console.log(
      "Sending Lead Data to API:",
      JSON.stringify(apiRequestBody, null, 2),
    );

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      
      headers: {
        "Content-Type": "application/json",
      },
    });

    response.status = apiResponse.data?.status;
    response.message = apiResponse.data?.message;
  } catch (error) {
    response.error = error.response?.data?.message || error.message;
  }
  return response;
}

async function processBatch(users) {
  const promises = users.map((user) => sendToNewAPI(user));
  const results = await Promise.all(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    console.log("User:", user.phone, "Response:", response);

    const updateResponse = await UserDB.updateOne(
      { phone: user.phone },
      {
        $set: {
          processed: true, // Mark as processed
          apiResponse: response, // Store API response in a new field
        },
        $unset: { accounts: "" }, // Optionally remove 'accounts' field
      },
    );

    console.log(`Update Response for ${user.phone}:`, updateResponse);
  }
}

async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads && processedCount < MAX_LEADS) {
      console.log("🔄 Fetching users...");

      const leads = await UserDB.aggregate([
        {
          $match: { processed: { $ne: true }, apiResponse: { $exists: false } },
        }, // Filter out leads with existing apiResponse
        { $limit: 10 },
      ]);

      console.log("🔹 Fetched Leads:", JSON.stringify(leads, null, 2));

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
          const batch = leads.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
          processedCount += batch.length;
          console.log(`Processed ${processedCount} leads.`);

          if (processedCount >= MAX_LEADS) {
            console.log("✅ Reached the limit of 10 leads.");
            hasMoreLeads = false;
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("🚫 Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

loop();
