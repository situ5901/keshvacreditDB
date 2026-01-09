const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

/* ================= CONFIG ================= */
const MONGODB_URINEW = process.env.MONGODB_RSUnity;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);


const BATCH_SIZE = 100;

const BaseURL =
  "https://crmadmin.digicredit.in/backend/api/dashboard/get-dsa-leads";

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVyIjoiZGlnaWtjX3VzZXIiLCJ1dG0iOiJESUdJS0MxMyIsImlhdCI6MTc2NTg2NDQ2M30.R6FNI4FEEMxoXuzcQVbLMiHwlIPwZNqvu0lgHXZOQww"; // fallback (not recommended)


function getHeader(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

/* ================= DIGICREDIT API ================= */

async function DigiCreditApi(user) {
  const phone = user.phone; 

  try {
    const payload = {
      mobile: phone,
      partnerId: "DIGIKC13",
    };

    const response = await axios.post(
      BaseURL,
      payload,
      getHeader(token)
    );

    console.log(`\n--- API Response for---`,payload);
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (err) {
    if (err.response) {
      console.error(
        `❌ API Error for ${phone} (Status: ${err.response.status})`,
        JSON.stringify(err.response.data, null, 2)
      );
      return err.response.data;
    } else {
      console.error(`❌ Network Error for ${phone}:`, err.message);
      return {
        success: false,
        message: err.message,
      };
    }
  }
}


async function processUser(user) {
  const phone = user.phone;

  const leadCreateResponse = await DigiCreditApi(user);

  const updateDoc = {
    $push: {
      apiResponse: {
        DigiCredit: {
          leadCreate: leadCreateResponse,
        },
        createdAt: new Date().toLocaleString(),
      },
      RefArr: {
        name: "DigiCredit",
        createdAt: new Date().toLocaleString(),
      },
    },
    $unset: {
      accounts: "",
    },
  };

  try {
    await UserDB.updateOne({ phone }, updateDoc);
    console.log(`✅ Database updated for user: ${phone}`);
  } catch (dbError) {
    console.error(
      `❌ Failed to update DB for user ${phone}:`,
      dbError.message
    );
  }
}

async function main() {
  await mongoose.connection.asPromise();

  try {
    let totalProcessed = 0;

    while (true) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "DigiCredit" } },
        ],
      })
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) {
        console.log(
          `\n🎉 All ${totalProcessed} users processed for DigiCredit`
        );
        break;
      }

      console.log(`\n🔍 Processing batch of ${users.length} users...`);

      await Promise.all(users.map((user) => processUser(user)));

      totalProcessed += users.length;
    }
  } catch (err) {
    console.error("🚫 Error in main loop:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed");
  }
}

main();
