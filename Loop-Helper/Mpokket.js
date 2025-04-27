const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const PartnerID = "Keshvacredit";
const dedupeAPI = "https://api.mpkt.in/acquisition-affiliate/v1/dedupe/check";
const CreateUserAPI = "https://api.mpkt.in/acquisition-affiliate/v1/user";
const API_KEY = "2A331F81163D447C9B5941910D2BD";

async function sendToNewAPI(user) {
  try {
    const email = user?.email ? user.email.toString() : "";
    const phone = user?.phone ? user.phone.toString() : "";

    if (!email || !phone) {
      console.error(`❌ Missing Email or Phone for user: ${user._id}`);
      return null; // Skip this user
    }

    const payload = {
      email_id: Buffer.from(email).toString("base64"),
      mobile_number: Buffer.from(phone).toString("base64"),
      partnerId: PartnerID,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(dedupeAPI, payload, {
      headers: {
        "Content-Type": "application/json",
        "api-key": API_KEY,
      },
    });

    console.log("✅ Eligibility Response:");
    console.log(JSON.stringify(response.data, null, 2)); // Pretty print

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

async function getPreApproval(user) {
  try {
    const payload = {
      mobile_no: user.phone,
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

    console.log("✅ PreApproval Response:");
    console.log(JSON.stringify(response.data, null, 2)); // Pretty print

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

async function startProcessing() {
  try {
    while (true) {
      console.log("📦 Fetching leads...");

      const users = await UserDB.find({
        "RefArr.name": { $ne: "Mpokket" },
      }).limit(10); // Fetch 10 leads at a time to speed up

      if (users.length === 0) {
        console.log("⏸️ No leads found. Retrying...");
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Optional, just in case no users
        continue;
      }

      // Create an array of promises for concurrent API calls
      const promises = users.map(async (user) => {
        const response = await sendToNewAPI(user);
        if (response && response.status_code === "1205") {
          const preApproval = await getPreApproval(user);
          return { user, response, preApproval };
        }
        return { user, response };
      });

      // Wait for all promises to complete concurrently
      const results = await Promise.all(promises);

      // Process the results
      for (const result of results) {
        const { user, response, preApproval } = result;

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

        if (preApproval) {
          updateDoc.$push.apiResponse = {
            MpokketResponse: {
              ...response,
              Mpokket: true,
            },
            status: preApproval.status,
            message: preApproval.message,
            createdAt: new Date().toISOString(),
          };
        }

        await UserDB.updateOne({ _id: user._id }, updateDoc);
        console.log(`✅ Lead processed successfully: ${user.phone}`);
      }
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
