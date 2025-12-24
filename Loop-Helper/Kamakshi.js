const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

// MongoDB connection
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const newAPI =
  "https://kamakshimoney.com/loanapply/kamakshimoney_api/lead_gen/api/v1/create_lead";
const MAX_LEADS = 50;
const Partner_id = "Keshvacredit";
const loanAmount = "20000"; // must be string

// Send a single lead to external API
async function sendToNewAPI(lead) {
  let response = {};
  try {
    const formattedDob = new Date(lead.dob).toISOString().slice(0, 10);

    // Validate phone number
    if (!lead.phone || isNaN(lead.phone)) {
      response.status = "failed";
      response.message = "Invalid mobile number";
      return response;
    }

    const apiRequestBody = {
      mobile: lead.phone,
      name: lead.name,
      email: lead.email,
      employeeType: lead.employment,
      dob: formattedDob,
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
    response.message = apiResponse.data.message || "No message from API";
  } catch (error) {
    response.status = "failed";
    response.message = error.response?.data?.message;

    if (error.response) {
      console.error("❌ API Error:", {
        statusCode: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error("❌ Axios Error:", error.message);
    }
  }

  return response;
}

// Process a batch of users
async function processBatch(users) {
  const promises = users.map(async (user) => {
    const existingUser = await UserDB.findOne({ phone: user.phone });

    if (existingUser && existingUser.isSentToAPI) {
      console.log(`📞 ${user.phone} already processed, skipping...`);
      return { status: "skipped", message: "Already processed" };
    }

    return sendToNewAPI(user);
  });

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
            Kamakshi: response.value,
            message: response.value?.message || "No message",
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

// Loop and process all unprocessed leads in batches
let processedCount = 0;

async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching new leads...");

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
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`✅ Total Processed: ${processedCount}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("⏳ Waiting for 1 second before next batch...");
      }
    }
  } catch (err) {
    console.error("🚨 Error in loop:", err.message);
  } finally {
    mongoose.connection.close();
  }
}

// Start processing
loop();
