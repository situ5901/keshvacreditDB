const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_VISHU;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);

const BATCH_SIZE = 500;
const PartnerID = "Keshvacredit";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const API_KEY = "2A331F81163D447C9B5941910D2BD";

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

async function getPreApproval(user) {
  try {
    const payload = {
      mobile_no: user.phone?.toString(),
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

async function processBatch(users) {
  const promises = users.map(async (user) => {
    const userDoc = await UserDB.findOne({ phone: user.phone });
    if (!userDoc) {
      console.log("❌ No matching user found for:", user.phone);
      return;
    }

    // Step 1️⃣ — Call both APIs
    const dedupeResponse = await sendToNewAPI(user);
    const preApprovalResponse = await getPreApproval(user);

    // Step 2️⃣ — Combine both responses
    const mpokketResponse = {
      dedupeResponse,
      preApprovalResponse,
      createdAt: new Date().toISOString(),
    };

    // Step 3️⃣ — Update MongoDB
    const updateDoc = {
      $push: {
        apiResponse: {
          MpokketResponse: mpokketResponse,
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "Mpokket",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
      $set: { processed: true },
    };

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
    console.log("✅ Lead processed and saved for:", user.phone);
  });

  await Promise.allSettled(promises);
}

let totalcount = 0;

async function startProcessing() {
  try {
    while (true) {
      console.log("📦 Fetching unprocessed leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
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
