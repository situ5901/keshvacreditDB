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
  "https://preprod.ramfincorp.co.in/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";
const MAX_LEADS = 10;
const Partner_id = "Keshvacredit";
const loanAmount = 20000;
let processedCount = 0;

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

    console.log(
      "Sending Lead Data to API:",
      JSON.stringify(apiRequestBody, null, 2),
    );

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX3FwZzhUZ1pGemlTcTY5ejRWb01wd3E2dGdLYUprUDZtOkUydmp4a0pCbHNWZFRFQkhkQ3puV29Nak1IN0ZSS3NW",
      },
    });

    if (
      apiResponse.data &&
      apiResponse.data.status &&
      apiResponse.data.message
    ) {
      response.status = apiResponse.data.status;
      response.message = apiResponse.data.message;
    } else {
      response.status = "Unknown status";
      response.message = "No message returned";
    }
  } catch (error) {
    response.status = "failed";
    response.message =
      error.response?.data?.message || error.message || "Unknown error";
    console.error("Error occurred:", error);
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

    while (hasMoreLeads) {
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
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`Processed ${processedCount} leads.`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("🚫 Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

loop();
