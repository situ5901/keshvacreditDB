const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();



const MONGODB_URINEW = process.env.MONGODB_RSUnity;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);



const BASE_URL = "https://backend.creditsea.com/api/v1";
const ENDPOINT = "leads/create-lead-dsa";
const SOURCE_ID = "77445946";
const BATCH_SIZE = 1000;

let totalSuccessCount = 0;
let totalApiHits = 0;



function getHeaders() {
  return {
    headers: {
      "Content-Type": "application/json",
      sourceid: SOURCE_ID,
    },
  };
}

async function LeadCreation(user) {
  totalApiHits++;

  try {
    let dobFormatted = "";
    if (user.dob) {
      const date = new Date(user.dob);
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      dobFormatted = `${dd}-${mm}-${yyyy}`;
    }

    const data = {
      first_name: user.name,
      last_name: user.last_name || ".",
      phoneNumber: Number(user.phone),
      pan: user.pan,
      dob: dobFormatted,
      gender: user.gender?.toLowerCase(),
      pinCode: user.pincode,
      income: String(user.income),
      partner_Id: "KeshvaCredit",
      employmentType: user.employment,
    };

    const response = await axios.post(
      `${BASE_URL}/${ENDPOINT}`,
      data,
      getHeaders(),
    );

    console.log(`✅ Lead created for ${user.phone}:`, response.data);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || {
      error: err.message,
      status: err.response?.status,
    };
    console.error(`🚫 Lead creation failed for ${user.phone}:`, errorData);
    return errorData;
  }
}

async function processUser(user) {
  const leadResponse = await LeadCreation(user);

  const updateDoc = {
    $push: {
      apiResponse: {
        CreditSea: leadResponse, // 👈 Jo bhi API ka res aaya (success/error)
        createdAt: new Date().toLocaleString(),
      },
      RefArr: {
        name: "creditsea",
        createdAt: new Date().toLocaleString(),
      },
    },
    $unset: { account: "" },
  };

  try {
    await UserDB.updateOne({ _id: user._id }, updateDoc);
    console.log(`✅ Database updated for user: ${user.phone}`);
  } catch (err) {
    console.error(
      `🚫 Failed to update DB for user ${user.phone}:`,
      err.message,
    );
  }

  if (leadResponse && leadResponse.message === "Lead generated successfully") {
    totalSuccessCount++;
  }
}

async function main() {
  try {
    let batchNumber = 1;
    while (true) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "creditsea" } },
        ],
      }).limit(BATCH_SIZE);

      if (users.length === 0) {
        console.log("🎉 All users processed for CreditSea");
        break;
      }

      console.log(`\n--- Starting Batch ${batchNumber} ---`);
      console.log(
        `🔍 Data fetched in this batch (potential hits): ${users.length}`,
      );

      for (const user of users) {
        await processUser(user);
      }

      console.log(`\n--- Batch ${batchNumber} Summary ---`);
      console.log(`🔥 Total API Hits so far: ${totalApiHits}`);
      console.log(`✅ Total Successful Leads so far: ${totalSuccessCount}`);
      console.log(`--- End of Batch ${batchNumber} ---\n`);

      batchNumber++;
    }

    console.log(`📊 Total API Hits (Data Sent): ${totalApiHits}`);
    console.log(`✅ Total Successful Leads: ${totalSuccessCount}`);
  } catch (err) {
    console.error("🚫 Error in main loop:", err);
  } finally {
    mongoose.connection.close();
    console.log("🔒 MongoDB connection closed");
  }
}
main();
