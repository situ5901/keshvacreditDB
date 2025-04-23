const axios = require("axios");
const mongoose = require("mongoose");
const pLimit = require("p-limit");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const MAX_LEADS = 5;
const CONCURRENCY_LIMIT = 10; // Adjust as needed
const Partner_id = "Keshvacredit";
const loanAmount = 20000;

const newAPI =
  "https://preprod.ramfincorp.co.in/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";
const limit = pLimit(CONCURRENCY_LIMIT);

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

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

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX3FwZzhUZ1pGemlTcTY5ejRWb01wd3E2dGdLYUprUDZtOkUydmp4a0pCbHNWZFRFQkhkQ3puV29Nak1IN0ZSS3NW",
      },
    });

    response.status = apiResponse.data.status;
    response.message = apiResponse.data.message;
  } catch (error) {
    response.status = "failed";
    response.message =
      error.response?.data?.message || "API did not return a valid response";

    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
  }
  return response;
}

async function processBatch(users) {
  const tasks = users.map((user) => limit(() => sendToNewAPI(user)));
  const results = await Promise.all(tasks);

  const bulkOps = users.map((user, i) => ({
    updateOne: {
      filter: { phone: user.phone },
      update: {
        $push: {
          apiResponse: {
            status: results[i].status,
            message: results[i].message,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "RamFin",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      },
    },
  }));

  const bulkResult = await UserDB.bulkWrite(bulkOps);
  console.log("🔄 Bulk update result:", bulkResult);
}

async function loop() {
  let processedCount = 0;
  try {
    while (true) {
      console.log("🔄 Fetching users...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "RamFin" },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        console.log("🚫 No more leads to process.");
        break;
      }

      await processBatch(leads);
      processedCount += leads.length;
      console.log(`✅ Processed ${processedCount} leads.`);
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

loop();
