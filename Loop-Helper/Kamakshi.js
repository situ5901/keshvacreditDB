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
const MAX_LEADS = 5;
const Partner_id = "Keshvacredit";
const loanAmount = "20000"; // ✅ as string

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

async function processBatch(users) {
  const promises = users.map((user) => sendToNewAPI(user));
  const results = await Promise.allSettled(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    console.log(`📞 ${user.phone} => 🧾`, response);

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
            name: "kamakshi",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      },
    );

    console.log(`✅ Mongo Updated: ${user.phone}`, updateResponse);
  }
}

async function loop() {
  let processedCount = 0;
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching new leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "kamakshi" },
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
        console.log(`✅ Total Processed: ${processedCount}`);
      }
    }
  } catch (err) {
    console.error("🚨 Error in loop:", err.message);
  } finally {
    mongoose.connection.close();
  }
}
loop();
