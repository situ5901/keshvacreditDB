
const path = require("path");
const mongoose = require("mongoose");
const axios = require("axios");
const xlsx = require("xlsx");
require("dotenv").config();

const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "FI_pincode.xlsx");
const TOKEN_API_URL = "https://vnotificationgw.epifi.in/v1/auth/token";
const LEAD_API_URL = "https://vnotificationgw.epifi.in/v1/leads/loans/create";

const BATCH_SIZE = 11;
const REF_NAME = "PI";

const MONGODB_URINEW = process.env.MONGODB_VISHU;
//
mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "zype",
  new mongoose.Schema({}, { collection: "zype", strict: false }),
);

function loadValidPincodes() {
  try {
    const workbook = xlsx.readFile(PINCODE_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const pincodes = new Set();
    data.forEach((row) => {
      if (row[0]) {
        pincodes.add(String(row[0]).trim());
      }
    });
    console.log(`✅ Loaded ${pincodes.size} valid pincodes from Excel.`);
    return pincodes;
  } catch (error) {
    console.error(`❌ Error loading pincode file: ${error.message}`);
    return new Set();
  }
}

async function getAuthToken() {
  const payload = {
    client_id: "keshvacredit",
    client_secret: "usH-ew;mcv5lk7<4",
  };
  const { data } = await axios.post(TOKEN_API_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data?.auth_token || data?.data?.auth_token;
}

function formatDate(dob) {
  try {
    const date = new Date(dob);
    if (isNaN(date)) return null;
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

async function sendToPI(user, token) {
  const fullName = user.name ? user.name.trim() : "";

  let firstName = "";
  let lastName = "";

  if (fullName === "") {
    firstName = "";
    lastName = "";
  } else {
    const nameParts = fullName.split(" ");
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = "Sharma";
    } else {
      firstName = nameParts.shift();
      lastName = nameParts.join(" ");
    }
  }

  const payload = {
    client_request_id: `REQ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name: {
      first: firstName,
      last: lastName,
    },
    phone_number: String(user.phone),
    email: user.email,
    pan: user.pan,
    dob: formatDate(user.dob),
    current_address: {
      pincode: String(user.pincode),
    },
    employment_details: {
      employment_type: ["SALARIED", "SELF_EMPLOYED"].includes(
        user.employment?.toUpperCase(),
      )
        ? user.employment.toUpperCase()
        : "SALARIED",
      monthly_income: String(user.income || "0"),
    },
    loan_requirement: {
      desired_loan_amount: String(user.desired_loan_amount || 350000),
    },
    custom_fields: {
      utm_source: "google_ads",
      agent_code: "AGT777",
      ref_campaign: "monsoon-offer-2025",
    },
    evaluation_type: "BASIC",
  };

  console.log("📤 Sending Payload to API for user:", user.phone);

  try {
    const { data } = await axios.post(LEAD_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("✅ Full API Response:\n", JSON.stringify(data, null, 2));
    return { success: true, data };
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error(
      `❌ API Error for user ${user.phone}:\n`,
      JSON.stringify(errorData, null, 2),
    );
    return { success: false, data: errorData };
  }
}
let successCount = 0;
async function processBatch(users, validPincodes) {
  for (const user of users) {
    const token = await getAuthToken();
    console.log(`🔑${user.phone} Token: ${token}`);
    const userPincode = String(user.pincode).trim();
    const income = Number(user.income || 0);
    let updateDoc;

    // 🧾 Income filter
    if (income < 25000) {
      console.log(`⛔ Skipping ${user.phone} due to low income: ₹${income}`);
      updateDoc = {
        $push: {
          RefArr: {
            name: REF_NAME,
            message: `Income ₹${income} is below 25000.`,
            createdAt: new Date().toISOString(),
          },
        },
      };
      await UserDB.updateOne({ phone: user.phone }, updateDoc);
      continue;
    }

    // 📍 Pincode check
    if (validPincodes.has(userPincode)) {
      console.log(
        `✅ Valid pincode ${userPincode} for user ${user.phone}. Sending to PI...`,
      );

      const result = await sendToPI(user, token);
      const response = result?.data || {};

      // ✅ Check API response status
      if (response.status?.code === 0) {
        successCount++;
        console.log(`🎯 Success count: ${successCount}`);

        if (successCount >= 3000) {
          console.log("✅✅ Reached 3000 successful API hits. Stopping now.");
          break;
        }
      }

      updateDoc = {
        $push: {
          apiResponse: {
            PIResponse: response,
            createdAt: new Date().toISOString(),
          },
          RefArr: {
            name: REF_NAME,
            createdAt: new Date().toISOString(),
          },
        },
      };
    } else {
      console.log(
        `❌ Invalid pincode ${userPincode} for ${user.phone}. Skipping.`,
      );
      updateDoc = {
        $push: {
          RefArr: {
            name: REF_NAME,
            message: `Pincode ${userPincode} is not valid.`,
            createdAt: new Date().toISOString(),
          },
        },
      };
    }

    await UserDB.updateOne({ phone: user.phone }, updateDoc);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // ⏳ 1s delay between hits
  }
}

async function main() {
  try {
    const validPincodes = loadValidPincodes();

    if (validPincodes.size === 0) {
      console.error("🚫 No valid pincodes loaded. Exiting.");
      return;
    }

    while (true) {
      const leads = await UserDB.aggregate([
        {
          $match: {
            $and: [{ "RefArr.name": { $ne: REF_NAME } }],
          },
        },
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All eligible leads processed.");
        break;
      }

      await processBatch(leads, validPincodes);
      console.log(`✅ Processed ${leads.length} leads in this batch`);
    }
  } catch (err) {
    console.error("❌ Error in main function:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("👋 MongoDB connection closed.");
  }
}

main();
