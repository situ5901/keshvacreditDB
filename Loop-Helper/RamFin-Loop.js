const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "utilsdb",
  new mongoose.Schema({}, { collection: "utilsdb", strict: false }),
);
//situ
const newAPI =
  "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";
const MAX_LEADS = 5;
const Partner_id = "Keshvacredit";
const loanAmount = 20000;
let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const apiRequestBody = {
      customer_name: lead.name,
      email: lead.email,
      mobile: lead.phone,
      pancard: lead.pan,
      Partner_id: Partner_id,
      loan_amount: lead.loanAmount || loanAmount,
    };

    console.log(
      "📤 Sending Lead Data to Ramfin API:",
      JSON.stringify(apiRequestBody, null, 2),
    );

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
      timeout: 10000, // 10 seconds timeout
    });

    response.status = apiResponse.data.status || "success";
    response.message = apiResponse.data.message || "Lead created successfully";
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

// Option 1: Parallel Database Updates (as suggested previously)
async function processBatch(users) {
  const promises = users.map(async (user) => {
    const apiResponse = await sendToNewAPI(user);
    console.log("📞 User:", user.phone, "➡️ Response:", apiResponse);

    try {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              RamFin: {
                status: apiResponse.status,
                message: apiResponse.message,
              },
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
      console.log(`✅ Updated DB for ${user.phone}:`, updateResponse);
    } catch (err) {
      console.error(`❌ Failed to update DB for ${user.phone}:`, err.message);
    }
  });

  await Promise.all(promises); // Wait for all API calls and DB updates to complete for the batch
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
        await processBatch(leads); // Use either the parallel or bulk update version
        processedCount += leads.length;
        console.log(`✅ Processed ${processedCount} leads so far.`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay to prevent rate-limiting
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message);
  } finally {
    mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
}

loop();
