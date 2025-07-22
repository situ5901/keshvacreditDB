const mongoose = require("mongoose");
const axios = require("axios");
const path = require("path");
const xlsx = require("xlsx");
require("dotenv").config();

// --- Configuration Constants ---
const TOKEN_API_URL = "https://vnotificationgw.epifi.in/v1/auth/token";
const LEAD_API_URL = "https://vnotificationgw.epifi.in/v1/leads/loans/create";
const BATCH_SIZE = 10;
const REF_NAME = "PI"; // Reference name for tracking processed leads
const PINCODE_FILE_PATH = path.join(__dirname, "..", "xlsx", "FI_pincode.xlsx");

// --- MongoDB Connection ---
const MONGODB_URINEW = process.env.MONGODB_URINEW;

if (!MONGODB_URINEW) {
  console.error("🚫 MONGODB_URINEW is not defined in .env file.");
  process.exit(1); // Exit if DB URI is missing
}

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("🚫 MongoDB Connection Error:", err);
    process.exit(1); // Exit on DB connection failure
  });

// Define a Mongoose model for the LoanTap collection
const UserDB = mongoose.model(
  "LoanTap",
  new mongoose.Schema({}, { collection: "LoanTap", strict: false }),
);

// --- Pincode Validation Logic ---

/**
 * Loads valid pincodes from an Excel file.
 * @param {string} filePath - The full path to the Excel file.
 * @returns {string[]} An array of valid pincode strings.
 */
function loadValidPincodes(filePath) {
  try {
    // Check if the file exists before attempting to read
    if (!require("fs").existsSync(filePath)) {
      console.error(`❌ Pincode file not found at: ${filePath}`);
      return [];
    }

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    // Ensure pincodes are trimmed and converted to string for consistent comparison
    return data
      .map((row) => String(row.Pincode || "").trim())
      .filter((p) => p !== "");
  } catch (error) {
    console.error(
      `❌ Error loading valid pincodes from ${filePath}:`,
      error.message,
    );
    return [];
  }
}

const validPincodes = loadValidPincodes(PINCODE_FILE_PATH);

if (validPincodes.length === 0) {
  console.warn(
    "⚠️ No valid pincodes loaded. All leads with pincode validation will be skipped.",
  );
} else {
  console.log(`✅ Loaded ${validPincodes.length} valid pincodes.`);
}

// --- API Authentication ---

/**
 * Fetches an authentication token from the API.
 * @returns {Promise<string|null>} The authentication token or null if an error occurs.
 */
async function getAuthToken() {
  const payload = {
    client_id: "keshvacredit",
    client_secret: "usH-ew;mcv5lk7<4",
  };
  try {
    const { data } = await axios.post(TOKEN_API_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    const authToken = data?.auth_token || data?.data?.auth_token;
    if (!authToken) {
      console.error("❌ Auth token not found in response:", data);
      return null;
    }
    console.log("✅ Auth Token obtained.");
    return authToken;
  } catch (err) {
    console.error(
      "❌ Error getting auth token:",
      err.response?.data || err.message,
    );
    return null;
  }
}

// --- Data Formatting Helpers ---

/**
 * Formats a date string into YYYY-MM-DD.
 * @param {string} dob - Date of birth string.
 * @returns {string|null} Formatted date string or null if invalid.
 */
function formatDate(dob) {
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) {
      // Use getTime() to check for valid date object
      return null;
    }
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch (e) {
    console.warn(`⚠️ Could not format DOB "${dob}": ${e.message}`);
    return null;
  }
}

// --- Lead Processing Logic ---

/**
 * Sends a single user lead to the external PI API.
 * Performs pincode validation before sending.
 * @param {object} user - The user object from MongoDB.
 * @param {string} token - The authentication token.
 * @returns {Promise<{success: boolean, data: object}|null>} Result of the API call or null if skipped.
 */
async function sendToPI(user, token) {
  const fullName = user.name ? String(user.name).trim() : "";
  let firstName = "",
    lastName = "";

  if (fullName === "") {
    firstName = ""; // Or a default like "Applicant"
    lastName = "Unknown"; // Or a default like "Unknown"
  } else {
    const nameParts = fullName.split(" ");
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = "Sharma"; // Default last name if only one part is provided
    } else {
      firstName = nameParts.shift();
      lastName = nameParts.join(" ");
    }
  }

  const pincode = String(user.pincode || "").trim();
  const userPhone = String(user.phone || "N/A"); // For better logging

  // Pincode validation: Skip API call if pincode is invalid
  if (!validPincodes.includes(pincode)) {
    console.warn(
      `⚠️ Invalid pincode for phone ${userPhone}: ${pincode}. Skipping API call.`,
    );
    const updateDoc = {
      $push: {
        RefArr: {
          name: REF_NAME,
          message: "pincode not valid",
          createdAt: new Date().toISOString(),
        },
      },
    };
    try {
      await UserDB.updateOne({ phone: user.phone }, updateDoc);
      console.log(`✅ MongoDB updated for invalid pincode: ${userPhone}`);
    } catch (dbErr) {
      console.error(
        `❌ Error updating DB for invalid pincode ${userPhone}: ${dbErr.message}`,
      );
    }
    return null; // Indicate that the API call was skipped
  }

  const payload = {
    client_request_id: `REQ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name: { first: firstName, last: lastName },
    phone_number: userPhone,
    email: user.email || "", // Ensure email is not undefined
    pan: user.pan || "", // Ensure pan is not undefined
    dob: formatDate(user.dob),
    current_address: {
      pincode: pincode,
    },
    employment_details: {
      employment_type: ["SALARIED", "SELF_EMPLOYED"].includes(
        String(user.employment || "").toUpperCase(),
      )
        ? String(user.employment).toUpperCase()
        : "SALARIED", // Default to SALARIED if not recognized
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

  console.log(
    `📤 Sending Payload for ${userPhone} to API:`,
    JSON.stringify(payload, null, 2),
  );

  try {
    const { data } = await axios.post(LEAD_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(
      `✅ API Response for ${userPhone}:\n`,
      JSON.stringify(data, null, 2),
    );
    return { success: true, data };
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error(
      `❌ API Error for ${userPhone}:\n`,
      JSON.stringify(errorData, null, 2),
    );
    return { success: false, data: errorData };
  }
}

/**
 * Processes a batch of user leads, sending them to the API and updating MongoDB.
 * @param {object[]} users - Array of user objects to process.
 * @param {string} token - Authentication token.
 */
async function processBatch(users, token) {
  for (const user of users) {
    const result = await sendToPI(user, token);

    // Skip if result is null (pincode not valid, already handled and updated in sendToPI)
    if (!result) {
      continue;
    }

    // Prepare update document for successful/failed API call
    const updateDoc = {
      $push: {
        apiResponse: {
          PIResponse: result.data,
          createdAt: new Date().toISOString(),
        },
        RefArr: {
          name: REF_NAME,
          message: result.success ? "success" : "failed", // Indicate success or failure
          createdAt: new Date().toISOString(),
        },
      },
    };

    try {
      await UserDB.updateOne({ phone: user.phone }, updateDoc);
      console.log(
        `✅ MongoDB updated for API response for phone: ${user.phone}`,
      );
    } catch (dbErr) {
      console.error(
        `❌ Error updating DB after API call for phone ${user.phone}: ${dbErr.message}`,
      );
    }

    // Introduce a delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
  }
}

// --- Main Execution Flow ---

async function main() {
  let token = null;
  try {
    token = await getAuthToken();
    if (!token) {
      console.error("🚫 Failed to obtain authentication token. Exiting.");
      return; // Exit if token is not available
    }

    while (true) {
      console.log(`🔍 Fetching next batch of ${BATCH_SIZE} leads...`);
      const leads = await UserDB.aggregate([
        { $match: { "RefArr.name": { $ne: REF_NAME } } }, // Find leads not yet processed by this reference
        { $limit: BATCH_SIZE },
      ]);

      if (leads.length === 0) {
        console.log("✅ All eligible leads processed or no new leads found.");
        break; // Exit loop if no leads are found
      }

      console.log(`Processing ${leads.length} leads...`);
      await processBatch(leads, token);
      console.log(`✅ Finished processing batch of ${leads.length} leads.`);
    }
  } catch (err) {
    console.error(
      "❌ An unhandled error occurred in main function:",
      err.message,
      err.stack,
    );
  } finally {
    console.log("Closing MongoDB connection.");
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

// Start the main process
main();
