const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// ✅ Environment & constants
const MONGODB_URINEW = process.env.MONGODB_URINEW;
const BASE_URL = "https://backend.creditsea.com/api/v1";
const ENDPOINT = "leads/create-lead-dsa";
const SOURCE_ID = "77445946";
const BATCH_SIZE = 100;

// ✅ MongoDB connection
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// ✅ MongoDB model
const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

// ✅ Headers for API
function getHeaders() {
  return {
    headers: {
      "Content-Type": "application/json",
      sourceid: SOURCE_ID,
    },
  };
}

// ✅ Function to create lead in CreditSea
async function LeadCreation(user) {
  try {
    // Format DOB as DD-MM-YYYY
    let dobFormatted = "";
    if (user.dob) {
      const date = new Date(user.dob);
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      dobFormatted = `${dd}-${mm}-${yyyy}`;
    }

    // API payload
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

    // API call
    const response = await axios.post(
      `${BASE_URL}/${ENDPOINT}`,
      data,
      getHeaders(),
    );

    console.log(`✅ Lead created for ${user.phone}:`, response.data);
    return response.data; // return full API response
  } catch (err) {
    console.error(
      `🚫 Lead creation failed for ${user.phone}:`,
      err.response?.data || err.message,
    );
    return null;
  }
}

// ✅ Process single user
async function processUser(user) {
  const leadResponse = await LeadCreation(user);
  if (!leadResponse) return;

  const updateDoc = {
    $push: {
      apiResponse: {
        CreditSea: leadResponse,
        createdAt: new Date(),
      },
      RefArr: {
        name: "creditsea",
        response: leadResponse,
        createdAt: new Date(),
      },
    },
    $unset: { account: "" }, // optional
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
}

// ✅ Main loop to process users in batches
async function main() {
  try {
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

      for (const user of users) {
        await processUser(user);
      }
    }
  } catch (err) {
    console.error("🚫 Error in main loop:", err);
  } finally {
    mongoose.connection.close();
    console.log("🔒 MongoDB connection closed");
  }
}

// ✅ Start processing
main();
