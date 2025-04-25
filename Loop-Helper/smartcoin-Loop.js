const mongoose = require("mongoose");
const axios = require("axios");
const qs = require("qs");
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

const BATCH_SIZE = 1;
const Partner_id = "Keshvacredit";

const ELIGIBILITY_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/dedup";
const PRE_APPROVAL_API =
  "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create";

function getHeaders() {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
    "admin-api-client-key": "esy7kphMG6G9hu90",
  };
}

async function sendToNewAPI(lead) {
  try {
    const payload = {
      phone_number: String(lead.phone),
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income,
      name_as_per_pan: lead.name,
      date_of_birth: lead.dob,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending Eligibility Payload:", payload);

    const response = await axios.post(ELIGIBILITY_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    console.log("✅ Eligibility API Response:", response.data);

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

async function getPreApproval(lead) {
  try {
    const payload = {
      phone_number: String(lead.phone),
      pan: lead.pan,
      employment_type: lead.employment,
      net_monthly_income: lead.income,
      name_as_per_pan: lead.name,
      date_of_birth: lead.dob,
      Partner_id: Partner_id,
    };

    console.log("📤 Sending PreApproval Payload:", payload);

    const response = await axios.post(PRE_APPROVAL_API, qs.stringify(payload), {
      headers: getHeaders(),
    });

    // Handle the successful API response
    console.log("✅ PreApproval API Response:", response.data);
    
    if (response.data.status === "success") {
      console.log("🎉 Lead created successfully with Lead ID:", response.data.leadId);
      // You can now process the lead ID and response data as needed
      return response.data; // Return the success data
    } else {
      console.error("❌ Failed to create lead:", response.data.message);
      return {
        status: "FAILED",
        message: response.data.message || "Unknown error",
      };
    }

  } catch (err) {
    console.error("❌ PreApproval API Error:", err.response?.data || err.message);
    return {
      status: "FAILED",
      message: err.response?.data?.message || err.message || "Unknown Error",
    };
  }
}


async function processBatch(leads) {
  const promises = leads.map(async (lead) => {
    try {
      const userDoc = await UserDB.findOne({ phone: lead.phone });

      if (
        userDoc.RefArr &&
        userDoc.RefArr.some((ref) => ref.name === "Smartcoin")
      ) {
        console.log(`⛔ Lead already processed for SmartCoin: ${lead.phone}`);
        return; // Skip the lead if Smartcoin is already in RefArr
      }

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
        await UserDB.updateOne({ phone: lead.phone }, { $set: updates });
      }

      const eligibilityResponse = await sendToNewAPI(lead);
      console.log("✅ Eligibility Response:", eligibilityResponse); // Log Eligibility Response

      const updateDoc = {
        $push: {
          apiResponse: {
            smartcoin: {
              ...eligibilityResponse,
              Smartcoin: true,
            },
            status: eligibilityResponse.status,
            message: eligibilityResponse.message,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: "Smartcoin",
            createdAt: new Date().toISOString(),
          },
        },
        $unset: { accounts: "" },
      };

      if (eligibilityResponse.status === "ACCEPT") {
        // Check if the message is 'no duplicate found and partner can proceed with the lead'
        if (
          eligibilityResponse.message ===
          "no duplicate found and partner can proceed with the lead"
        ) {
          // Only proceed to pre-approval if this message is received
          console.log("✅ Eligibility successful! Proceeding with Pre-Approval.");
          const preApprovalResponse = await getPreApproval(lead);
          console.log("✅ PreApproval Response:", preApprovalResponse); // Log PreApproval Response

          // Check if Pre-Approval response is successful
          if (preApprovalResponse.status === "success") {
            // If Pre-Approval was successful, update the database with the response
            updateDoc.$push.apiResponse.push({
              smartcoinRespo: preApprovalResponse,
              status: preApprovalResponse.status,
              message: preApprovalResponse.message, // Dynamic message from Pre-Approval response
              createdAt: new Date().toISOString(),
            });

            console.log("✅ Lead created successfully in Pre-Approval API.");
          } else {
            console.log("⛔ Pre-Approval failed:", preApprovalResponse.message);
          }
        } else {
          console.log(
            "⛔ No pre-approval, as eligibility message is not as expected.",
          );
        }
      } else {
        console.log(
          `⛔ No PreApproval — Status: ${eligibilityResponse.status}`,
        );
      }

      await UserDB.updateOne({ phone: lead.phone }, updateDoc);
    } catch (err) {
      console.error("❌ Error processing lead:", err.message);
    }
  });

  await Promise.all(promises);
}

async function Loop() {
  try {
    while (true) {
      console.log("📦 Fetching new leads...");
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: "Smartcoin" } } }, // Filter leads where Smartcoin is not in RefArr
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All leads processed. No more new data.");
        break;
      }

      await processBatch(leads); // Process the leads without delay
    }
  } catch (error) {
    console.error("❌ Error occurred in loop:", error.message);
  } finally {
    console.log("🔌 Closing DB connection...");
    mongoose.connection.close();
  }
}

Loop();
