const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.ASIJAVISHAL3;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err.message));

const UserDB = mongoose.model(
  "mvcoll",
  new mongoose.Schema({}, { collection: "mvcoll", strict: false }),
);

const newAPI = "https://marketing.sotcrm.com/affiliates";
const MAX_LEADS = 5;

async function sendToNewAPI(lead) {
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      first_name: lead.name,
      last_name: lead.last_name || "Kumar",
      email: lead.email,
      employment_type: lead.employment,
      pan: lead.pan,
      dob: lead.dob ? new Date(lead.dob).toISOString().split("T")[0] : "1995-08-15",
      pincode: lead.pincode,
      monthly_income: lead.income,
      utm_source: "keshvacredit",
    };


    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Auth: "ZTI4MTU1MzE4NWQ2MGQyZTFhNWM0NGU3M2UzMmM3MDM=",
      },
      timeout: 10000,
    });

    return apiResponse.data;
  } catch (error) {
    const errorData = error.response ? error.response.data : { error: error.message };
    console.error(`📥 [API ERROR] Failed for ${lead.phone}:`, JSON.stringify(errorData));
    return errorData;
  }
}

async function processBatch(users) {
  console.log(`📦 Processing batch of ${users.length} users...`);
  
  const promises = users.map(async (user) => {
    const employment = user.employment;
    const income = parseInt(user.income) || 0;

    if (employment !== "Salaried" || income < 18000) {
      console.log(`⏩ [SKIPPED] User ${user.phone}: Employment=${employment}, Income=${income}`);
      try {
        await UserDB.updateOne(
          { phone: user.phone },
          {
            $push: {
              RefArr: {
                name: "SOT",
                status: "Skipped",
                reason: "Low Income or Non-Salaried",
                createdAt: new Date().toLocaleString(),
              },
            },
          }
        );
        console.log(`💾 [DB UPDATED] Skip status saved for ${user.phone}`);
      } catch (err) {
        console.error(`❌ [DB ERROR] Failed to save skip status for ${user.phone}:`, err.message);
      }
      return;
    }

    const rawApiResponse = await sendToNewAPI(user);

    try {
      await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              SOT: rawApiResponse,
              createdAt: new Date().toLocaleString(),
            },
            RefArr: {
              name: "SOT",
              status: "Sent",
              createdAt: new Date().toLocaleString(),
            },
          },
          $unset: { accounts: "" },
        }
      );
      console.log(`💾 [DB UPDATED] API Response saved for ${user.phone}`);
    } catch (err) {
      console.error(`❌ [DB ERROR] Failed to save API response for ${user.phone}:`, err.message);
    }
  });

  await Promise.all(promises);
}

async function loop() {
  try {
    let processedTotal = 0;
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("\n🔍 Searching for new leads...");
      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "SOT" },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🏁 No more leads found. Process finished.");
      } else {
        await processBatch(leads);
        processedTotal += leads.length;
        console.log(`📊 Total leads handled in this session: ${processedTotal}`);
      }

      console.log("⏳ Waiting 1 second for next batch...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("🚫 [CRITICAL ERROR] Loop crashed:", error.message);
  } finally {
    mongoose.connection.close();
    console.log("🔌 MongoDB Connection Closed.");
  }
}

loop();
