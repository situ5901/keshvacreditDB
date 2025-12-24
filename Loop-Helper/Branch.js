const mongoose = require("mongoose");
require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

const MONGODB_URINEW = process.env.MONGODB_URINEW;
//update
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "zype",
  new mongoose.Schema({}, { collection: "zype", strict: false }),
);

function getHeader() {
  return {
    "X-BRANCH-API-KEY": "d63pdkqwmhkhUqyTT9UsJwPvJOaPFf/H",
    "Content-Type": "application/json",
  };
}

const BATCH_SIZE = 5; // kitne users ek batch me process karne hai
function generateRequestId() {
  return crypto.randomBytes(8).toString("hex");
}

function getStateCode(stateName) {
  const stateMapping = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    Assam: "AS",
    Bihar: "BR",
    Chhattisgarh: "CG",
    Goa: "GA",
    Gujarat: "GJ",
    Haryana: "HR",
    "Himachal Pradesh": "HP",
    Jharkhand: "JH",
    Karnataka: "KA",
    Kolkata: "KL",
    Villupuram: "VL",
    Kerala: "KL",
    "Madhya Pradesh": "MP",
    Maharashtra: "MH",
    Manipur: "MN",
    Meghalaya: "ML",
    Mizoram: "MZ",
    Nagaland: "NL",
    Odisha: "OD",
    Punjab: "PB",
    Rajasthan: "RJ",
    Sikkim: "SK",
    "Tamil Nadu": "TN",
    Telangana: "TG",
    Tripura: "TR",
    "Uttar Pradesh": "UP",
    Uttarakhand: "UK",
    "West Bengal": "WB",
    Delhi: "DL",
    "Jammu and Kashmir": "JK",
    Ladakh: "LA",
    "Andaman and Nicobar Islands": "AN",
    Chandigarh: "CH",
    "Dadra and Nagar Haveli and Daman and Diu": "DD",
    Lakshadweep: "LD",
    Puducherry: "PY",
  };
  return stateMapping[stateName] || stateName;
}

function splitName(fullName) {
  if (!fullName) return { firstName: "NA", lastName: "NA" };

  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "NA",
  };
}

async function createLead(user) {
  try {
    const { firstName, lastName } = splitName(user.name);

    const payload = {
      requestId: generateRequestId(),
      userData: {
        nationalIdNumber: user.pan,
        mobileNumber: user.phone,
        email: user.email,
        firstName: firstName,
        lastName: lastName || user.lastName || user.surname || "NA",
        gender: user.gender,
        dob: user.dob,
        profession: user.employment,
        address: {
          street: user.street || "NA",
          city: user.city,
          state: getStateCode(user.state),
          pincode: user.pincode,
        },
      },
      bureauData: {
        creditScore: 750,
        bureau: "CIBIL",
        monthlyIncome: parseInt(user.income) || 0,
        creditHistory: {
          delinquencies: {
            last6Months: { dpd0: 0 },
            last12Months: { dpd30: 0 },
          },
          writeOffs: {
            count: 0,
            details: [],
          },
          loans: {
            personal: {
              last6Months: {
                count: 1,
                details: [{ loanAmount: "", status: "" }],
              },
              last36Months: {
                count: 2,
                details: [
                  { loanAmount: "", status: "" },
                  { loanAmount: "", status: "" },
                ],
              },
            },
          },
        },
      },
    };

    console.log("📌 Payload:", payload);

    const response = await axios.post(
      "https://branch.co/partners/v1/soft_offers",
      payload,
      { headers: getHeader() },
    );

    console.log("✅ API Response:", response.data);
    return { success: true, data: response.data }; // Return a success object
  } catch (err) {
    console.error("❌ Error in createLead:", err.response?.data || err.message);
    // Return a failure object with the error details
    return {
      success: false,
      error: err.response?.data || { reason: err.message },
    };
  }
}

async function processBatch(users) {
  let successCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        console.log(`🚀 Processing user: ${user.phone}`);

        const leadResponse = await createLead(user);

        const updateDoc = {
          $push: {
            apiResponse: {
              Branch: leadResponse,
              createdAt: new Date().toISOString(),
            },
            RefArr: { name: "Branch", createdAt: new Date().toISOString() },
          },
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ _id: user._id }, updateDoc);
        console.log(`✅ DB updated for ${user.phone}`);

        if (
          leadResponse.success &&
          leadResponse.data?.decision?.status === "APPROVED" &&
          leadResponse.data?.decision?.code === 1
        ) {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Failed for user ${user.phone}:`, err.message);
      }
    }),
  );

  results.forEach((result, idx) => {
    if (result.status === "rejected")
      console.error(`Batch item ${idx} rejected:`, result.reason);
  });

  return successCount;
}

// ✅ Main Loop
async function processData() {
  let totalSuccess = 0;
  let totalHits = 0;
  let skip = 0;

  console.log("🚦 Starting Branch user processing...");

  try {
    while (true) {
      if (totalHits >= 100) {
        console.log("🛑 Limit reached: 100 API hits completed. Stopping...");
        break;
      }

      const remainingLimit = 100 - totalHits;
      const limit = Math.min(BATCH_SIZE, remainingLimit); // don't exceed 100 hits

      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "Branch" } },
        ],
      })
        .skip(skip)
        .limit(limit)
        .lean();

      if (!users.length) {
        console.log("📭 No more users left to process.");
        break;
      }

      // 🧠 Count how many users are actually hit (not just successful)
      const batchCount = await processBatch(users);

      totalHits += users.length;
      totalSuccess += batchCount;
      skip += users.length;

      console.log(
        `📊 Batch Done: ${users.length} hits | ${batchCount} approved | Total Hits: ${totalHits}/100`,
      );
    }

    console.log("--------------------------------------------------");
    console.log("✅ Processing completed.");
    console.log(`🎯 Total Hits: ${totalHits}`);
    console.log(`🏆 Total Successful (APPROVED): ${totalSuccess}`);
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("❌ Fatal error in processData:", err);
  } finally {
    mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

// 🚀 Start
processData();
