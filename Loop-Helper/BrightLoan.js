const mongoose = require("mongoose");
require("dotenv").config();
const axios = require("axios");

const BATCH_SIZE = 10;
const MONGODB_URI = process.env.MONGODB_RSUnity;
const PREPROD_URL =
  "https://preprod-api.blsfintech.com/marketing-push-lead-data";

// Database Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);
function getHeader() {
  return {
    "AUTH": "KeshsfsdervfsdsfdsfdKJDKJWksj43mds34567nnmxmdkjsadsfdsfd",
    "Content-Type": "application/json",
    "Username": "keshvacredit_20250320",
    "Accept": "application/json",
  };
}

async function sendToApi(user) {
  try {
    const payload = {
      full_name: user.name,
      mobile: user.phone,
      email: user.email,
      pancard: user.pan,
      pincode: user.pincode,
      monthly_salary: user.income,
      income_type: user.employment,
      dob: user.dob,
      gender: user.gender,
    };

    const apiResponse = await axios.post(PREPROD_URL, payload, {
      headers: getHeader(),
    });

    return apiResponse.data;
  } catch (err) {
    const errorMsg = err.response
      ? JSON.stringify(err.response.data)
      : err.message;
    throw new Error(errorMsg);
  }
}

async function processBatch(users) {
  await Promise.allSettled(
    users.map(async (user) => {
      try {
        console.log(`🚀 Checking user: ${user.phone}`);

        if (user.employment !== "Salaried" && user.employment !== "Salarid") {
          console.log(
            `⚠️ Skipping ${user.phone}: Employment is ${user.employment}`,
          );
          await UserDB.updateOne(
            { _id: user._id },
            {
              $push: {
                RefArr: {
                  name: "BrightLoan",
                  message: "Skipped: Not Salaried",
                  createdAt: new Date().toLocaleString(),
                },
              },
              $unset: { account: "" },
            },
          );
          return;
        }

        const apiRes = await sendToApi(user);

        const updateDoc = {
          $push: {
            apiResponse: {
              BrightLoan: apiRes,
              createdAt: new Date().toLocaleString(),
            },
            RefArr: {
              name: "BrightLoan",
              createdAt: new Date().toLocaleString(),
            },
          },
          $unset: { account: "" },
        };

        await UserDB.updateOne({ _id: user._id }, updateDoc);
        console.log(`✅ Success: ${user.phone}`);
      } catch (error) {
        console.error(`❌ Error ${user.phone}: ${error.message}`);
      }
    }),
  );
}

async function main() {
  let hasMoreUsers = true;
  console.log("🚦 Script Started...");

  try {
    while (hasMoreUsers) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "BrightLoan" } },
        ],
      })
        .limit(BATCH_SIZE)
        .lean();

      if (!users || users.length === 0) {
        hasMoreUsers = false;
        console.log("🏁 All users processed.");
        break;
      }

      await processBatch(users);

      // --- Inline Delay Logic ---
      console.log(`📊 Batch Finished. Waiting 5 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("❌ Fatal Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Database Closed.");
  }
}

main();
