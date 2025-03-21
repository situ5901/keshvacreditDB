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
const newAPI =
  "https://preprod.ramfincorp.co.in/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";
const MAX_LEADS = 2;
const Partner_id = "Keshvacredit";

let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const mobile = lead.phone;
    const name = lead.Name;
    const loanAmount = lead.loanAmount;
    const email = lead.email;
    const employeeType = lead.employeeType;
    const dob = lead.dob;
    const pancard = lead.pan;

    const apiRequestBody = {
      mobile: mobile,
      name: name,
      loanAmount: loanAmount,
      email: email,
      employeeType: employeeType,
      dob: dob,
      pancard: pancard,
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
        $set: {
          processed: true,
          "apiResponse.status": response.status,
          "apiResponse.message": response.message,
          ranfin: true,
          createAt: new Date().toISOString(),
        },
        $unset: { accounts: "" },
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
        },
        { $limit: 2 },
      ]);

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
