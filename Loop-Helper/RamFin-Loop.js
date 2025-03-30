const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false })
);

const BATCH_SIZE = 1;
const MAX_LEADS = 5;
const Partner_id = "Keshvacredit";
const newAPI = "https://fin-api-3zx0.onrender.com/products";

let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const { phone, Name, email, dob, pan, employeeType } = lead;

    const apiRequestBody = {
      mobile: phone,
      name: Name,
      email: email,
      employeeType: employeeType,
      dob: dob,
      pancard: pan,
      Partner_id: Partner_id,
    };

    console.log("🔹 Sending Data to API:", JSON.stringify(apiRequestBody, null, 2));

    const apiResponse = await axios.post(newAPI, apiRequestBody);

    response.status = apiResponse.data?.status || "success";
    response.message = apiResponse.data?.message || "Lead processed successfully";
  } catch (error) {
    response.status = "failed";
    response.message = error.response?.data?.message || error.message || "Unknown error";
  }
  return response;
}

async function processBatch(users) {
  const results = await Promise.all(users.map((user) => sendToNewAPI(user)));

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    console.log("✅ API Response for", user.phone, ":", response);

    await UserDB.updateOne(
      { phone: user.phone },
      {
        $push: {
          apiResponse: { // ✅ New API response will be added instead of replacing
            status: response.status,
            message: response.message,
            createdAt: new Date().toISOString(),
          },
          refArr: { 
           name: "RamFin" ,
           createdAt: new Date().toISOString(),
          } // ✅ New entry in refArr
        },
        $unset: { accounts: "" },
      }
    );
    
    console.log(`🟢 Updated user ${user.phone} in database.`);
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
            "refArr.name": { $ne: "RamFin" }, 
          },
        },
        { $limit: 5 },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
          const batch = leads.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
          processedCount += batch.length;
          console.log(`🔵 Processed ${processedCount} leads.`);
          if (processedCount >= MAX_LEADS) {
            console.log("✅ Reached the limit of 2 leads.");
            hasMoreLeads = false;
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error("🚫 Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

loop();