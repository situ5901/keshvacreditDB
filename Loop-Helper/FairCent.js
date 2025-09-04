const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const BATCH_SIZE = 2;
const Partner_id = "keshvacredit";

const BASE_URL = "https://api.faircent.com";
const DEDUPAPI = `${BASE_URL}/v1/api/duplicateCheck`;
const LEAD_API = `${BASE_URL}/v1/api/aggregrator/register/user`;

// ✅ Fixed headers
async function getHeader() {
  return {
    "Content-Type": "application/json",
    "x-application-id": "1cfa78742af22b054a57fac6cf830699",
    "x-application-name": "KESHVACREDIT",
  };
}

// 🔹 Payload builder (doc ke hisaab se)
function buildPayload(user) {
  const [fname, ...lnameParts] = (user.name || "").trim().split(" ");
  const lname = lnameParts.join(" ") || "";

  let dobFormatted = "";
  if (user.dob) {
    const dob = new Date(user.dob);
    if (!isNaN(dob)) dobFormatted = dob.toISOString().split("T")[0];
  }

  const gender = user.gender?.toUpperCase().startsWith("M")
    ? "M"
    : user.gender?.toUpperCase().startsWith("F")
      ? "F"
      : "";

  return {
    fname: fname || "",
    lname: lname || "",
    dob: dobFormatted,
    pan: user.pan,
    mobile: String(user.phone), // ✅ string hona chahiye
    pin: Number(user.pincode),
    state: user.state,
    city: user.city,
    address: user.address || user.city,
    mail: user.email,
    gender,
    employment_status: (user.employment || "").trim(),
    loan_purpose: 1365,
    loan_amount: 35000,
    monthly_income: Number(user.income),
    partner_id: Partner_id,
  };
}

async function CheckDedup(user) {
  try {
    const payload = {
      mobile: String(user.phone),
      pan: user.pan,
      email: user.email,
    };
    const response = await axios.post(DEDUPAPI, payload, {
      headers: await getHeader(),
    });
    console.log(`📞 Dedup Response for ${user.phone}:`, response.data);
    return response.data || {};
  } catch (err) {
    console.error(
      `❌ Dedup API Failed for ${user.phone}:`,
      err.response?.data || err.message,
    );
    return {};
  }
}

async function LeadAPI(user) {
  try {
    const payload = buildPayload(user);

    if (payload.monthly_income < 25000) {
      console.warn(`⚠️ Skipping user ${user.phone} (Income < 25K)`);
      return { message: "Skipped: Income < 25K" };
    }

    console.log(`📤 Lead Payload for ${user.phone}:`, payload);

    const response = await axios.post(LEAD_API, payload, {
      headers: await getHeader(),
    });

    console.log(`✅ Lead API Response for ${user.phone}:`, response.data);
    return response.data;
  } catch (err) {
    console.error(
      `❌ Lead API Failed for ${user.phone}:`,
      err.response?.data || err.message,
    );
    return {};
  }
}

async function processBatch(users) {
  let attributedSuccessfullyCount = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        console.log(`🚀 Processing user: ${user.phone}`);

        const [dedupeResponse, leadResponse] = await Promise.all([
          CheckDedup(user),
          LeadAPI(user),
        ]);

        const faircentData = {
          dedupe: dedupeResponse,
          lead: leadResponse,
        };

        const updateDoc = {
          $push: {
            apiResponse: {
              Faircent: faircentData,
              createdAt: new Date().toISOString(),
            },
            RefArr: { name: "Faircent", createdAt: new Date().toISOString() },
          },
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ _id: user._id }, updateDoc);
        console.log(`✅ DB updated for ${user.phone}`);

        if (
          leadResponse.message &&
          typeof leadResponse.message === "string" &&
          leadResponse.message.includes("Attributed Successfully")
        ) {
          attributedSuccessfullyCount++;
          console.log(`⭐ Lead Attributed Successfully: ${user.phone}`);
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

  return attributedSuccessfullyCount;
}

async function processData() {
  let totalAttributedSuccessfully = 0;
  let skip = 0;

  console.log("🚦 Starting Faircent user processing...");

  try {
    while (true) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: "Faircent" } },
        ],
      })
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (!users.length) break;

      const batchCount = await processBatch(users);
      console.log(`📊 Batch Done: ${batchCount} users attributed successfully`);
      totalAttributedSuccessfully += batchCount;
      skip += users.length;
    }

    console.log("--------------------------------------------------");
    console.log("✅ All batches processed.");
    console.log(
      `🎯 Total Leads Attributed Successfully: ${totalAttributedSuccessfully}`,
    );
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("❌ Fatal error in processData:", err);
  } finally {
    mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

processData();
