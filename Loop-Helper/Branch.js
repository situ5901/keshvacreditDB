// branchBatch.js
const mongoose = require("mongoose");
require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

const MONGODB_URINEW = process.env.MONGODB_URINEW;
const BATCH_SIZE = 1; // kitne users ek batch me process karne hai

// ✅ MongoDB connect
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "mvcoll",
  new mongoose.Schema({}, { collection: "mvcoll", strict: false }),
);

function getHeader() {
  return {
    "X-BRANCH-API-KEY": "d63pdkqwmhkhUqyTT9UsJwPvJOaPFf/H",
    "Content-Type": "application/json",
  };
}

function generateRequestId() {
  return crypto.randomBytes(8).toString("hex");
}

function getStateCode(stateName) {
  const stateMapping = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BR",
    "Chhattisgarh": "CG",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kolkata": "KL",
    "Villupuram": "VL",
    "Kerala": "KL",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Odisha": "OD",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TG",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UK",
    "West Bengal": "WB",
    "Delhi": "DL",
    "Jammu and Kashmir": "JK",
    "Ladakh": "LA",
    "Andaman and Nicobar Islands": "AN",
    "Chandigarh": "CH",
    "Dadra and Nagar Haveli and Daman and Diu": "DD",
    "Lakshadweep": "LD",
    "Puducherry": "PY"
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

// ✅ API Function
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

// ✅ Batch Processor (MODIFIED)
// ✅ Batch Processor (MODIFIED)
async function processBatch(users) {
  let successCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        console.log(`🚀 Processing user: ${user.phone}`);

        const leadResponse = await createLead(user);

        // Store the entire response object (success or error)
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

        // Only increment the counter if the API response status is "APPROVED" and code is 1
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
  let skip = 0;

  console.log("🚦 Starting Branch user processing...");

  try {
    while (true) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "Branch" } },
        ],
      })
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (!users.length) break;

      const batchCount = await processBatch(users);
      console.log(`📊 Batch Done: ${batchCount} users processed successfully`);
      totalSuccess += batchCount;
      skip += users.length;
    }

    console.log("--------------------------------------------------");
    console.log("✅ All batches processed.");
    console.log(`🎯 Total Users Processed Successfully: ${totalSuccess}`);
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
