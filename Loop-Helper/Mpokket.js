const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_VISHU;

// ✅ Mongo Connection
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "zypeAlter",
  new mongoose.Schema({}, { collection: "zypeAlter", strict: false }),
);

// ✅ Constants
const BATCH_SIZE = 500;
const PartnerID = "Keshvacredit";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const API_KEY = "2A331F81163D447C9B5941910D2BD";

// ✅ Dedupe API
async function sendToNewAPI(user) {
  try {
    const email = user?.email ? user.email.toString() : "";
    const phone = user?.phone ? user.phone.toString() : "";

    if (!email || !phone) throw new Error("Email or Phone missing");

    const encodedEmail = Buffer.from(email).toString("base64");
    const encodedPhone = Buffer.from(phone).toString("base64");

    const payload = {
      email_id: encodedEmail,
      mobile_number: encodedPhone,
      partnerId: PartnerID,
    };

    console.log("📤 Sending Dedupe Payload:", payload);

    const response = await axios.post(dedupeAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ Dedupe API Response:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ Dedupe API Error:", err.response?.data || err.message);
    return {
      status: "FAILED",
      status_code: err.response?.status || "UNKNOWN",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// ✅ PreApproval API
async function getPreApproval(user) {
  try {
    const payload = {
      mobile_no: user.phone.toString(),
      pancard: user.pan,
      email_id: user.email,
      Full_name: user.name,
      date_of_birth: user.dob,
      profession: user.employment,
      partnerId: PartnerID,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(CreateUserAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ PreApproval API Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// ✅ Batch Processing
async function processBatch(users) {
  const promises = users.map(async (user) => {
    const userDoc = await UserDB.findOne({ phone: user.phone });

    if (!userDoc) {
      console.log("❌ No matching user found for:", user.phone);
      return;
    }

    // Step 1️⃣ — Call dedupe API
    const dedupeResponse = await sendToNewAPI(user);
    cons preApprovalResponse = await getPreApproval(user);

    // Prepare object for saving
    const mpokketResponse = {
      dedupeResponse, // save full dedupe response
    preApprovalResponse,
      createdAt: new Date().toISOString(),
    };

    // Step 2️⃣ — If eligible, call preApproval API
    // if (dedupeResponse?.status_code === "1205") {
    //   const preApprovalResponse = await getPreApproval(user);
    //   mpokketResponse.preApprovalResponse = preApprovalResponse;
    // } else {
    //   console.log(
    //     `⛔ Not eligible for PreApproval — Status: ${dedupeResponse?.status_code}`,
    //   );
    // }

    // Step 3️⃣ — Final update object
    const updateDoc = {
      $push: {
        apiResponse: {
          MpokketResponse: mpokketResponse, // both dedupe & preapproval
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "Mpokket",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    // Step 4️⃣ — Save to DB
    await UserDB.updateOne({ phone: user.phone }, updateDoc);
    await UserDB.updateOne(
      { phone: user.phone },
      { $set: { processed: true } },
    );

    console.log("✅ Lead processed and saved for:", user.phone);
  });

  await Promise.allSettled(promises);
}

// ✅ Start Processing
let totalcount = 0;

async function startProcessing() {
  try {
    while (true) {
      console.log("📦 Fetching unprocessed leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            processed: { $ne: true },
            "RefArr.name": { $ne: "Mpokket" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("⏸️ No more leads to process.");
        break;
      }

      await processBatch(leads);
      totalcount += leads.length;
      console.log(`🎉 Total Processed: ${totalcount}`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing MongoDB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
