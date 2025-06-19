const crypto = require("crypto");
const axios = require("axios");

// Constants
const API_URL = "https://dev-tsp-los.lendenclub.com/v2/";
const KEY = "03f4e9c37121bbe88545b5a06cd7e619"; // ✅ 32-character UTF-8 string
const IV = "47ed667825c963ab"; // ✅ 16-character UTF-8 string
const PARTNER_CODE = "LKC";
const AUTH_TOKEN = "e70783bb76614b48a9299c77367748"; // For STPL
const API_CODE = "CREATE_LEAD_API_V2";
const AES_BLOCK_SIZE = 16; // ✅ AES block size is always 16 bytes

// Sample payload
const payload = {
  payload: {
    basic_details: {
      mobile_number: "8850689034",
      email: "test@gmail.com",
      name: "Bhanupriya Bhatnagar",
      pan: "BCLPD9988G",
      date_of_birth: "15/10/1990",
    },
    address_details: {
      type: "COMMUNICATION",
      address_line: "charni Road",
      pincode: 400009,
      state_code: "MH",
    },
    professional_details: {
      occupation_type: "SALARIED",
      company_name: "COMPANY NAME",
      income: 30000,
    },
    loan_details: {
      amount: 10000,
      interest: {
        type: "FLAT",
        frequency: "MONTHLY",
        value: 3,
      },
      tenure: {
        type: "MONTHLY",
        value: 2,
      },
    },
    consent_data: {
      content: ["hello"],
      ip_address: "127.0.0.1",
      latitude: 18.52043,
      longitude: 19.52043,
      device_id: "23456789",
      consent_dtm: "2024-09-05 12:04:31.132 +0530",
    },
  },
  api_code: API_CODE,
};

// PKCS7 padding and unpadding
function pad(text) {
  const padLength = AES_BLOCK_SIZE - (text.length % AES_BLOCK_SIZE);
  return text + String.fromCharCode(padLength).repeat(padLength);
}

function unpad(text) {
  const padLength = text.charCodeAt(text.length - 1);
  return text.slice(0, -padLength);
}

// AES encryption
function encryptAES(plainText) {
  const paddedText = pad(plainText);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(KEY, "utf8"),
    Buffer.from(IV, "utf8"),
  );
  let encrypted = cipher.update(paddedText, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

// AES decryption (optional for response)
function decryptAES(cipherText) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(KEY, "utf8"),
    Buffer.from(IV, "utf8"),
  );
  let decrypted = decipher.update(cipherText, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return unpad(decrypted);
}

// SHA-256 checksum
function generateHash(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Main API call
async function sendPostRequest() {
  try {
    const jsonPayload = JSON.stringify(payload);
    const encryptedPayload = encryptAES(jsonPayload);
    const checksum = generateHash(encryptedPayload);

    const headers = {
      "Content-Type": "application/json",
      "partner-code": PARTNER_CODE,
      Authorization: AUTH_TOKEN,
      "api-code": API_CODE,
    };

    const requestData = {
      payload: encryptedPayload,
      checksum: checksum,
    };

    console.log("📤 Sending request to LendenClub...");

    const response = await axios.post(API_URL, requestData, { headers });

    console.log("✅ Encrypted Response:", response.data);

    // Optional: Decrypt server response
    if (response.data.payload) {
      const decrypted = decryptAES(response.data.payload);
      console.log("\n🔓 Decrypted Response:");
      console.log(JSON.parse(decrypted));

      // Verify server checksum
      const expected = generateHash(response.data.payload);
      if (response.data.checksum === expected) {
        console.log("✅ Server checksum matched");
      } else {
        console.warn("❌ Server checksum mismatch");
      }
    }
  } catch (err) {
    console.error("❌ API Error:", err.response?.data || err.message);
  }
}

sendPostRequest();
