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
const BATCH_SIZE = 10;
const newAPI =
  "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";

const MAX_LEADS = 90000;
const Partner_id = "Keshvacredit";
const loanAmount = 20000;
let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const mobile = lead.phone;
    const name = lead.name;
    const email = lead.email;
    const employeeType = lead.employment;
    const dob = lead.dob;
    const pancard = lead.pan;

    const apiRequestBody = {
      mobile: mobile,
      name: name,
      email: email,
      employeeType: employeeType,
      dob: dob,
      pancard: pancard,
      loanAmount: loanAmount,
      Partner_id: Partner_id,
      // loanAmount: loanAmount,
    };

    console.log(
      "Sending Lead Data to API:",
      JSON.stringify(apiRequestBody, null, 2),
    );

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
    });

    response.status = apiResponse.data?.status || "success";
    response.message =
      apiResponse.data?.message || "Lead processed successfully";
  } catch (error) {
    response.status = "failed";
    response.message =
      error.response?.data?.message || error.message || "Unknown error";
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
        $push: {
          apiResponse: {
            // ✅ New API response will be added instead of replacing
            status: response.status,
            message: response.message,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "RamFin",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      },
    );

    console.log(`UpdateResponse for ${user.phone}:`, updateResponse);
  }
}

async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads && processedCount < MAX_LEADS) {
      console.log("🔄 Fetching users...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "RamFin" },
          },
        },
        { $limit: 90000 },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
          const batch = leads.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
          processedCount += batch.length;
          console.log(`✅ Processed ${processedCount} leads.`);

          if (processedCount >= MAX_LEADS) {
            console.log("🎯 Reached the limit of leads.");
            hasMoreLeads = false;
            break;
          }

          // ⏳ Wait after every 5 batches
          const batchNumber = i / BATCH_SIZE + 1;
          if (batchNumber % 10 === 0) {
            console.log(`⏳ Waiting 3 seconds after batch ${batchNumber}...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            console.log("✅ Done waiting.");
          }
        }

        // ✅ Delay log added here
        console.log("⏳ Waiting 5 seconds before next fetch...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log("✅ Done waiting. Continuing...");
      }
    }
  } catch (error) {
    console.error("🚫 Error:", error);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

loop();
