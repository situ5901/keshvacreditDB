const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const newAPI = "https://marketing.sotcrm.com/affiliates";
const MAX_LEADS = 5;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const apiRequestBody = {
      mobile: lead.phone,
      first_name: lead.name,
      last_name: lead.last_name || "Kumar",
      email: lead.email,
      employment_type: lead.employment,
      pan: lead.pan,
      dob: lead.dob
        ? new Date(lead.dob).toISOString().split("T")[0]
        : "1995-08-15",
      pincode: lead.pincode,
      monthly_income: lead.income,
      utm_source: "keshvacredit",
    };

    console.log(
      "📤 Sending Lead Data to SOT API:",
      JSON.stringify(apiRequestBody, null, 2),
    );

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Auth: "ZTI4MTU1MzE4NWQ2MGQyZTFhNWM0NGU3M2UzMmM3MDM=",
        Cookie: "ci_session=3v2hpnl2ifpmp73jsaq30hh632co36vk",
      },
      timeout: 10000, // 10 seconds timeout
    });

    response.status = apiResponse.data.status || "success";
    response.message =
      apiResponse.data.message || "Lead submitted successfully";
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
              SOT: {
                status: apiResponse.status,
                message: apiResponse.message,
                dataStatus: apiResponse.rawData?.Status,
                dataMessage: apiResponse.rawData?.Message,
              },
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "SOT",
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

  await Promise.all(promises);
}

async function loop() {
  try {
    let processedCount = 0;
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching users...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "SOT" }, // ✅ Prevent re-sending
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
        console.log(`✅ Processed ${processedCount} leads so far.`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("🚫 Error in loop:", error.message);
  } finally {
    mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
}

loop();
