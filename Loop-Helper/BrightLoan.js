const mongoose = require("mongoose");
require("dotenv").config();
const axios = require("axios");

const BATCH_SIZE = 10;
const MONGODB_URI = process.env.MONGODB_RSUnity;
const PREPROD_URL = "https://preprod-api.blsfintech.com/marketing-push-lead-data";

// Database Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

// Headers matching your cURL exactly
function getHeader() {
  return {
    "Auth": "KeshsfsdervfsdsfdsfdKJDKJWksj43mds34567nnmxmdkjsadsfdsfd",
    "Username": "keshvacredit",
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

async function sendToApi(user) {
  try {
    // Data mapping to match API requirements (Types: Number vs String)
    const payload = {
      full_name: user.name || "",
      mobile: String(user.phone), 
      email: user.email || "",
      pancard: user.pan || "",
      pincode: Number(user.pincode),
      monthly_salary: Number(user.income),
      // Mapping: Salaried = 1 (as seen in your curl)
      income_type: (user.employment === "Salaried" || user.employment === "Salarid") ? 1 : 2,
      dob: user.dob || "", // Ensure format is YYYY-MM-DD
      // Mapping: Male = 1, Female = 2
      gender: (user.gender && user.gender.toLowerCase() === "male") ? 1 : 2,
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
        console.log(`🚀 Processing: ${user.phone}`);

        // Filtering Logic
        if (user.employment !== "Salaried" && user.employment !== "Salarid") {
          console.log(`⚠️ Skipping ${user.phone}: Not Salaried`);
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
            }
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