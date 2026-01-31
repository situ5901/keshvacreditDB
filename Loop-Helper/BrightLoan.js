const mongoose = require("mongoose");
require("dotenv").config();
const axios = require("axios");
const path = require("path");
const xlsx = require("xlsx");

const BATCH_SIZE = 1;
const MONGODB_URI = process.env.MONGODB_RSUnity;
const PREPROD_URL = "https://api.blsfintech.com/marketing-push-lead-data";
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "BrightLoan.csv");

// Database Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

function loadValidPincodes() {
  try {
    const workbook = xlsx.readFile(PINCODE_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // header: 1 returns an array of arrays
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const pincodes = new Set();
    data.forEach((row) => {
      if (row[0]) {
        pincodes.add(String(row[0]).trim());
      }
    });
    console.log(`✅ Loaded ${pincodes.size} valid pincodes from Excel.`);
    return pincodes;
  } catch (error) {
    console.error(`❌ Error loading pincode file: ${error.message}`);
    return new Set();
  }
}

function getHeader() {
  return {
    Auth: "KeshsfsdervfsdsfdsfdKJDKJWksj43mds34567nnmxmdkjsadsfdsfd",
    Username: "keshvacredit",
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function sendToApi(user) {
  try {
    const payload = {
      full_name: user.name || "",
      mobile: String(user.phone),
      email: user.email || "",
      pancard: user.pan || "",
      pincode: Number(user.pincode),
      monthly_salary: Number(user.income),
      income_type:
        user.employment === "Salaried" || user.employment === "Salarid" ? 1 : 2,
      dob: user.dob || "",
      gender: user.gender && user.gender.toLowerCase() === "male" ? 1 : 2,
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

async function processBatch(users, validPincodes) {
  await Promise.allSettled(
    users.map(async (user) => {
      try {
        const userPincode = String(user.pincode || "").trim();

        // 1. Check Employment Type
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
            },
          );
          return;
        }

        // 2. Check Pincode Match
        if (!validPincodes.has(userPincode)) {
          console.log(
            `⚠️ Skipping ${user.phone}: Pincode ${userPincode} not matched`,
          );
          await UserDB.updateOne(
            { _id: user._id },
            {
              $push: {
                RefArr: {
                  name: "BrightLoan",
                  message: "Pincode not Match",
                  createdAt: new Date().toLocaleString(),
                },
              },
            },
          );
          return;
        }

        // 3. API Call (If all checks pass)
        console.log(`🚀 Hitting API for User: ${user.phone}`);
        const apiRes = await sendToApi(user);

        console.log(`--------------------------------------------------`);
        console.log(`📩 API RESPONSE FOR ${user.phone}:`);
        console.log(JSON.stringify(apiRes, null, 2));
        console.log(`--------------------------------------------------`);

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
        console.log(`✅ Success: ${user.phone} updated in DB.`);
      } catch (error) {
        console.error(`❌ Error for ${user.phone}: ${error.message}`);
      }
    }),
  );
}

async function main() {
  console.log("🚦 Loading Configuration...");
  const validPincodes = loadValidPincodes();

  if (validPincodes.size === 0) {
    console.error("❌ No pincodes loaded. Please check your Excel file path.");
    process.exit(1);
  }

  let hasMoreUsers = true;
  console.log("🚦 Batch Processing Started...");

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

      await processBatch(users, validPincodes);

      console.log(`📊 Batch Finished. Waiting 1 second...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("❌ Fatal Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Database Connection Closed.");
  }
}

main();
