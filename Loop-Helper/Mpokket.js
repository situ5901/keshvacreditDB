const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const BATCH_SIZE = 1; // You can adjust this number based on your needs
const PartnerID = "Keshvacredit";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const API_KEY = "2A331F81163D447C9B5941910D2BD";

// Function to send request to the Dedupe API
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

    console.log("✅ Eligibility Response:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ Eligibility API Error:", err.message);
    return {
      status: "FAILED",
      status_code: err.response?.status || "UNKNOWN",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Function to get pre-approval from the Create User API
async function getPreApproval(user) {
  try {
    const payload = {
      mobile_no: user.phone,
      pancard: user.pan,
      email_id: user.email,
      Full_name: user.name,
      date_of_birth: user.dob,
      profession: "salaried",
      partnerId: PartnerID,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(CreateUserAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ PreApproval Response:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ PreApproval API Error:", err.message);
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Function to process each user without waiting for others
async function processUser(user) {
  try {
    const userDoc = await UserDB.findOne({ phone: user.phone });

    if (userDoc) {
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
        const preApproval = await getPreApproval(user);
        updateDoc.$push.apiResponse = {
          MpokketResponse: {
            ...response,
            Mpokket: true,
          },
          status: preApproval.status,
          message: preApproval.message,
          createdAt: new Date().toISOString(),
        };
      } else {
        console.log(`⛔ No PreApproval — Status Code: ${response.status_code}`);
      }

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
      await UserDB.updateOne(
        { phone: user.phone },
        { $set: { processed: true } },
      );

      console.log("✅ Lead processed successfully:", user.phone);
    }
  } catch (error) {
    console.error("❌ Error processing user:", user.phone, error.message);
  }
}

// Main loop to fetch leads and process them continuously
async function startProcessing() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "Mpokket" },
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("⏸️ No leads found.");
        break; // No more leads, stop processing
      }

      // Process users immediately as their API responses are received
      for (const lead of leads) {
        processUser(lead); // Start processing without waiting for completion
      }

      console.log(`🎉 Processing ${leads.length} leads...`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
