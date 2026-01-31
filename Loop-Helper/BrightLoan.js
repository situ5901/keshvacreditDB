const mongoose = require("mongoose");
require("dotenv").config();
const axios = require("axios");
const path = require("path");
const xlsx = require("xlsx"); // npm install xlsx

const BATCH_SIZE = 100;
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

/**
 * Helper: User ki age calculate karne ke liye
 */
function calculateAge(dobString) {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0; // Invalid Date handle karne ke liye

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Helper: Excel se pincodes load karne ke liye
 */
function loadValidPincodes() {
  try {
    const workbook = xlsx.readFile(PINCODE_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
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
        console.log(`🚀 Checking User: ${user.phone}`);

        // 1. FILTER: Employment Check
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

        // 2. FILTER: Age Check (21 to 55)
        const age = calculateAge(user.dob);
        if (age < 21 || age > 55) {
          console.log(
            `⚠️ Skipping ${user.phone}: Age ${age} is out of range (21-55)`,
          );
          await UserDB.updateOne(
            { _id: user._id },
            {
              $push: {
                RefArr: {
                  name: "BrightLoan",
                  message: `Age Criteria Not Met: ${age}`,
                  createdAt: new Date().toLocaleString(),
                },
              },
            },
          );
          return;
        }

        // 3. FILTER: Pincode Check
        const userPincode = String(user.pincode || "").trim();
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

        // --- SAB FILTERS PASS HONE PAR API HIT HOGA ---
        const apiRes = await sendToApi(user);

        console.log(
          `📩 API RESPONSE FOR ${user.phone}:`,
          JSON.stringify(apiRes, null, 2),
        );

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
  console.log("🚦 Loading Pincodes...");
  const validPincodes = loadValidPincodes();

  if (validPincodes.size === 0) {
    console.error("❌ No pincodes found. Check your Excel file.");
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
