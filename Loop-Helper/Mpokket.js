const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "loops",
  new mongoose.Schema({}, { collection: "loops", strict: false }),
);

const BATCH_SIZE = 1;
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

// Function to process users without waiting
async function processBatch(users) {
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

      const response = await sendToNewAPI(user);

      const updateDoc = {
        $push: {
          apiResponse: {
            MpokketResponse: {
              ...response,
              requestId: response?.data?.requestId || null, // ✅ Include requestId at top level
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

        // Replace the push with full merged object including preApproval response
        updateDoc.$push.apiResponse = {
          MpokketResponse: {
            ...response,
            requestId: response?.data?.requestId || null,
            Mpokket: true,
          },
          preApprovalResponse: preApproval, // ✅ Save full PreApproval response
          status: preApproval?.status || "SUCCESS",
          message: preApproval?.message || "Pre-approval completed",
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
  });

  // Run all in parallel and wait for all to complete
  await Promise.allSettled(promises);
}
let totalcount = 0;
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
      totalcount += leads.length;
      console.log(`🎉 Processed ${totalcount} leads successfully!`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

startProcessing();
