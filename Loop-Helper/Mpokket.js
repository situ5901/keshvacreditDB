const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// MongoDB Collection
const UserDB = mongoose.model(
  "Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
);

// Config
const BATCH_SIZE = 5;
const PartnerID = "Keshvacredit";
const dedupeAPI =
  "https://stg-api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://stg-api.mpkt.in/acquisition-affiliate/v1/user";
const API_KEY = "B6AB0D38B1B44BFC9F38789037D8D";

// Eligibility API
async function sendToNewAPI(user) {
  try {
    const encodedEmail = Buffer.from(user.email.toString()).toString("base64");
    const encodedPhone = Buffer.from(user.phone.toString()).toString("base64");

    const payload = {
      email_id: encodedEmail,
      mobile_number: encodedPhone,
      partnerId: PartnerID,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(dedupeAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY, // Ensure the correct header format
      },
    });

    console.log("✅ Eligibility Response:", response.data);
    return response.data;
  } catch (err) {
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Pre-Approval API
async function getPreApproval(user) {
  try {
    // Ensure name and employmentType are set, using empty strings or defaults if undefined
    const firstName = user.name || "Unknown";
    const employmentType = user.employment || "Unknown";

    const payload = {
      mobile_number: user.phone,
      email: user.email,
      first_name: firstName,
      date_of_birth: user.dob,
      employmentType: employmentType,
      partnerId: PartnerID,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(CreateUserAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY, // Ensure correct header name
      },
    });

    console.log("✅ PreApproval Response:", response.data);
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

// Process Each Lead
async function processBatch(users) {
  for (let user of users) {
    const userDoc = await UserDB.findOne({ phone: user.phone });

    const updates = {};
    let needUpdate = false;

    if (userDoc.apiResponse && !Array.isArray(userDoc.apiResponse)) {
      updates.apiResponse = [userDoc.apiResponse];
      needUpdate = true;
    }

    if (userDoc.preApproval && !Array.isArray(userDoc.preApproval)) {
      updates.preApproval = [userDoc.preApproval];
      needUpdate = true;
    }

    if (needUpdate) {
      await UserDB.updateOne({ phone: user.phone }, { $set: updates });
    }

    const response = await sendToNewAPI(user);

    const updateDoc = {
      $push: {
        apiResponse: {
          MpokketResponse: {
            ...response,
            Mpokket: true,
          },
          status_code: response.status_code,
          message: response.message,
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: "Mpokket",
          createdAt: new Date().toISOString(),
        },
      },
      $unset: { accounts: "" },
    };

    if (response.status_code === "1205") {
      // User is new, proceed with Pre-Approval API
      const preApproval = await getPreApproval(user);

      updateDoc.$push.apiResponse = {
        fullResponse: preApproval,
        status: preApproval.status,
        message: preApproval.message,
        createdAt: new Date().toISOString(),
      };
    } else {
      console.log(`⛔ No PreApproval — Status Code: ${response.status_code}`);
    }

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
  }
}

// Main Execution Loop (limited to 5)
async function startProcessing() {
  try {
    console.log("📦 Fetching leads...");

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
      console.log("✅ No leads found.");
      mongoose.connection.close();
      return;
    }

    console.log(`✅ Found ${leads.length} leads. Processing...`);
    await processBatch(leads);
    console.log("🎉 All 5 leads processed successfully!");
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
