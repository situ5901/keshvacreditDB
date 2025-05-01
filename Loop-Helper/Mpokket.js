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

async function processBatch(users) {
  const allResponses = []; // Store all responses for both APIs

  const promises = users.map(async (user) => {
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

      // Send data to dedupe API and capture the response
      const response = await sendToNewAPI(user);
      allResponses.push({
        phone: user.phone,
        dedupeAPIResponse: response, // Store response from dedupe API
      });

      // Check if PreApproval is required
      if (response.status_code === "1205") {
        const preApproval = await getPreApproval(user);
        allResponses.push({
          phone: user.phone,
          preApprovalResponse: preApproval, // Store response from create user API
        });

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

      // Update the user document with responses
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

      await UserDB.updateOne({ phone: user.phone }, updateDoc);
      await UserDB.updateOne(
        { phone: user.phone },
        { $set: { processed: true } },
      );

      console.log("✅ Lead processed successfully:", user.phone);
    }
  });

  // Wait for all promises to resolve concurrently
  await Promise.all(promises);

  // After batch is processed, show consolidated response for both APIs
  console.log("📊 Consolidated API Responses:");
  console.log("------------------------------------------------------------");
  allResponses.forEach((response) => {
    console.log(`Phone: ${response.phone}`);
    if (response.dedupeAPIResponse) {
      console.log("Dedupe API Response:", response.dedupeAPIResponse);
    }
    if (response.preApprovalResponse) {
      console.log("PreApproval API Response:", response.preApprovalResponse);
    }
    console.log("------------------------------------------------------------");
  });
}

async function startProcessing() {
  try {
    while (true) {
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
        console.log("⏸️ No leads found.");
        break; // No more leads, stop processing
      }

      await processBatch(leads); // Process all leads at once
      console.log(`🎉 Processed ${leads.length} leads successfully!`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
