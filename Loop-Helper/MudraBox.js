const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const API_URL = "https://loanapply.mudraboxx.in/api/collect-leads";
const CLIENT_ID = "IBYmtj1U5QtJ8LxrpAJ7vg==";
const SECRET_ID = "z3gg1ivv82c0073PLEkgxkuPe6+q3SHXk7tlcaPtlOU=";
const MONGODB_URINEW = process.env.MONGODB_URINEW; 

const BATCH_SIZE = 1; 

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "delhi",
  new mongoose.Schema({}, { collection: "delhi", strict: false }),
);


function getHeaders(clientId, secretId) {
  return {
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
      "x-secret-id": secretId,
    },
  };
}

async function CollMudraApi(user) {
  const Payload = {
    "data": [
      {
        "name": user.name,
        "email": user.email,
        "mobile": user.phone,
        "gender": user.gender,
        "dob": user.dob,
        "pancard": user.pan,
        "monthly_income": user.income,
        "profession": user.employment,
        "pincode": user.pincode,
        "lead_id": user.lead_id || user._id.toString(),
        "lead_type": user.lead_type 
      }
    ]
  };

  try {
    console.log(`Sending Payload for ${user.phone}:`, JSON.stringify(Payload, null, 2));

    const response = await axios.post(
      API_URL,
      Payload,
      getHeaders(CLIENT_ID, SECRET_ID)
    );
    return response.data;
    console.log(`✅ API Response for ${user.phone}:`, JSON.stringify(response.data, null, 2));
  } catch (err) {
    return err.response 
      ? err.response.data 
      : { success: false, message: `Network/Request Error: ${err.message}` };
  }
}


async function processUser(user) {
    const userPhone = user.phone;

    const leadCreateResponse = await CollMudraApi(user);

    const updateDoc = {
      $push: {
        apiResponse: {
          MudraBox: { 
            leadCreate: leadCreateResponse, 
          },
          createdAt: new Date(),
        },
        RefArr: {
          name: "MudraBox", 
          message: "API Call Completed. Response saved.", 
          createdAt: new Date(),
        },
      },
      $unset: { accounts: "" }, 
    };

    try {
      await UserDB.updateOne({ phone: userPhone }, updateDoc); 
      console.log(`✅ Database updated for user: ${userPhone}. Full API response saved.`);
    } catch (dbError) {
      console.error(
        `❌ Failed to update DB for user ${userPhone}:`,
        dbError.message,
      );
    }
}

async function main() {
  await mongoose.connection.asPromise(); 

  try {
    let batchNumber = 1;
    while (true) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "MudraBox" } },
        ],
      }).limit(BATCH_SIZE);

      if (users.length === 0) {
        console.log("🎉 All users processed for MudraBox");
        break;
      }

      console.log(`\n--- Starting Batch ${batchNumber} ---`);
      console.log(`🔍 Data fetched in this batch: ${users.length}`);

      for (const user of users) {
        if (user.phone && user.name) { 
            await processUser(user);
        } else {
            console.warn(`User with ID ${user._id} is missing required data (phone or name). Skipping.`);
        }
      }

      console.log(`--- End of Batch ${batchNumber} ---\n`);

      batchNumber++;
    }

  } catch (err) {
    console.error("🚫 Error in main loop:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed");
  }
}

main();
