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
  "loops",
  new mongoose.Schema({}, { collection: "loops", strict: false }),
);

// Config
const BATCH_SIZE = 10;
const PartnerID = "Keshvacredit";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";

const API_KEY = "2A331F81163D447C9B5941910D2BD";

// Eligibility API
async function sendToNewAPI(user) {
  try {
    const email = user?.Email ? user.Email.toString() : "";
    const phone = user?.Phone ? user.Phone.toString() : "";

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
    console.error(
      "❌ Eligibility API Error:",
      err.response?.data || err.message,
    );
    return {
      status: "FAILED",
      status_code: err.response?.status || "UNKNOWN",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}

// Pre-Approval API
async function getPreApproval(user) {
  try {
    const Full_name = user.Name || "Unknown";

    const payload = {
      mobile_no: String(user.Phone),
      email_id: user.Email,
      Full_name: Full_name,
      pancard: user.PanCard,
      date_of_birth: user.DOB,
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
    const userDoc = await UserDB.findOne({ Phone: user.Phone });

    // If document exists
    if (userDoc) {
      // Prepare updates
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

      // Update structure if needed
      if (needUpdate) {
        await UserDB.updateOne({ Phone: user.Phone }, { $set: updates });
      }

      // Send Eligibility API
      const response = await sendToNewAPI(user);

      // Prepare update document
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

      // If status is 1205, call PreApproval
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

      // Update document in MongoDB
      await UserDB.updateOne({ Phone: user.Phone }, updateDoc);

      // Mark lead as processed
      await UserDB.updateOne(
        { Phone: user.Phone },
        { $set: { processed: true } },
      );

      console.log("✅ Lead processed successfully:", user.Phone);
    }
  }
}

// Main Execution Loop (5 records only)
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
    console.log(`🎉 Processed ${leads.length} leads successfully!`);
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
