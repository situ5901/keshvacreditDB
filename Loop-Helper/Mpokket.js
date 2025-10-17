const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_VISHU;
//start
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "zypeAlter",
  new mongoose.Schema({}, { collection: "zypeAlter", strict: false }),
);

const BATCH_SIZE = 50;
const PartnerID = "Keshvacredit";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const API_KEY = "2A331F81163D447C9B5941910D2BD";

async function sendToNewAPI(user) {
  try {
    const email = user?.email ? user.email.toString() : "";
    const phone = user?.phone ? user.phone.toString() : "";

    if (!email || !phone) {
      throw new Error("Email or Phone is missing in user object");
    }

    const encodedEmail = Buffer.from(email).toString("base64");
    const encodedPhone = Buffer.from(phone).toString("base64");

    const payload = {
      email_id: encodedEmail,
      mobile_number: encodedPhone,
      partnerId: PartnerID,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(dedupeAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ Eligibility API Response:", response.data);
    // ⭐ Return the complete response body (which is response.data)
    return response.data;
  } catch (err) {
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    // Return a structured error object
    return {
      success: false,
      status_code: err.response?.status || "UNKNOWN",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

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
    // ⭐ Return the complete response body
    return response.data;
  } catch (err) {
    console.error(
      "❌ PreApproval API Error:",
      err.response?.data || err.message,
    );
    // Return a structured error object
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

async function processBatch(users) {
  const promises = users.map(async (user) => {
    const userDoc = await UserDB.findOne({ phone: user.phone });

    if (!userDoc) {
      console.log("❌ No matching user found in DB for phone:", user.phone);
      return;
    }

    // 1. Call Eligibility API
    const eligibilityResponse = await sendToNewAPI(user);

    // ⭐ SAVE THE COMPLETE ELIGIBILITY RESPONSE
    let mpokketResponseToSave = { 
      MpokketResponse: eligibilityResponse,
      PerApproval:getPreApproval,
      createdAt: new Date().toISOString(),
    };
    
    // Check for eligibility status code to proceed to Pre-Approval
    if (eligibilityResponse.status_code === "1205") {
      const preApprovalResponse = await getPreApproval(user);

      if (preApprovalResponse && preApprovalResponse.success) {
        // 2. If Pre-Approval is successful, update the main response structure
        // We nest the Pre-Approval response inside the main Eligibility response object
        eligibilityResponse.preApproval = preApprovalResponse; 

        // Update the object to be pushed, so the final saved record contains both responses
        mpokketResponseToSave = {
          MpokketResponse: eligibilityResponse,
          createdAt: new Date().toISOString(),
        };
        
        console.log(`✅ Successfully received PreApproval for: ${user.phone}`);
      } else {
        console.log(`⛔ PreApproval Failed or Unsuccessful for: ${user.phone}`);
      }
    } else {
      console.log(`⛔ No PreApproval initiated — Eligibility Status Code: ${eligibilityResponse.status_code}`);
    }

    // --- Database Update ---

    // Update the document to push the API response (either Eligibility only or Eligibility + PreApproval)
    const updateDoc = {
      $push: {
        apiResponse: mpokketResponseToSave, // Pushes the complete object
        RefArr: {
          name: "Mpokket",
          createdAt: new Date().toISOString(),
        },
      },
      // $unset: { accounts: "" }, // Keep this line if you want to remove the 'accounts' field
    };
    
    await UserDB.updateOne({ phone: user.phone }, updateDoc);
    
    // Set processed flag
    await UserDB.updateOne(
      { phone: user.phone },
      { $set: { processed: true } },
    );

    console.log("✅ Lead processed and saved in DB for:", user.phone);
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
