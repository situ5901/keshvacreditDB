const crypto = require("crypto");
const axios = require("axios");

// ✅ LendenClub API Constants
const API_URL = "https://dev-tsp-los.lendenclub.com/v2";
const KEY = "03f4e9c37121bbe88545b5a06cd7e619"; // 32 bytes
const IV = "47ed667825c963ab"; // 16 bytes
const AUTH_TOKEN = "e70783bb76614b48a9299c77367748";
const API_CODE = "CREATE_LEAD_API_V2";
const AES_BLOCK_SIZE = 16; // correct block size

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
      pincode: 5200156,
      state_code: "MH",
    },
    professional_details: {
      occupation_type: "SALARIED",
      company_name: "COMPANY NAME",
      income: 30000,
      bureau_score: 650,
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
      content: ["", ""],
      ip_address: "127.0.0.1",
      latitude: 18.52043,
      longitude: 19.52043,
      device_id: "23456789",
      consent_dtm: "2024-09-05 12:04:31.132 +0530",
    },
  },
};

// ✅ Padding helpers
function pad(data) {
  const buffer = Buffer.from(data, "utf-8");
  const padLen = AES_BLOCK_SIZE - (buffer.length % AES_BLOCK_SIZE);
  const padding = Buffer.alloc(padLen, padLen);
  return Buffer.concat([buffer, padding]);
}

function unpad(data) {
  const padLen = data[data.length - 1];
  return data.slice(0, data.length - padLen);
}

// ✅ AES Encryption/Decryption
function encryptAES(plainText, key, iv) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf-8"),
    Buffer.from(iv, "utf-8"),
  );
  const paddedData = pad(plainText);
  const encrypted = Buffer.concat([cipher.update(paddedData), cipher.final()]);
  return encrypted.toString("base64");
}

function decryptAES(encryptedText, key, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf-8"),
    Buffer.from(iv, "utf-8"),
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]);
  return unpad(decrypted).toString("utf-8");
}

// ✅ SHA256 Checksum
function generateChecksum(data) {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
}

// ✅ API Request Function
async function sendLeadRequest() {
  try {
    const jsonStr = JSON.stringify(payload);
    const encryptedPayload = encryptAES(jsonStr, KEY, IV);
    const checksum = generateChecksum(encryptedPayload);

    const finalPayload = {
      payload: encryptedPayload,
      checksum: checksum,
    };

    const headers = {
      "Content-Type": "application/json",
      "api-code": API_CODE,
      Authorization: AUTH_TOKEN,
    };

    console.log(
      "🔐 Encrypted Payload:\n",
      JSON.stringify(finalPayload, null, 2),
    );
    console.log("📩 Headers:\n", JSON.stringify(headers, null, 2));

    const response = await axios.post(API_URL, finalPayload, { headers });

    if (response.data?.payload) {
      const decrypted = decryptAES(response.data.payload, KEY, IV);
      console.log(
        "🔓 Decrypted Response:\n",
        JSON.stringify(JSON.parse(decrypted), null, 2),
      );
    } else {
      console.log("📡 Response:\n", JSON.stringify(response.data, null, 2));
    }
  } catch (err) {
    if (err.response) {
      console.error(
        "❌ API Error Response:",
        JSON.stringify(err.response.data, null, 2),
      );
    } else if (err.request) {
      console.error("❌ No response received:", err.message);
    } else {
      console.error("❌ Error:", err.message || err);
    }
  }
}

// ✅ Entry point
sendLeadRequest();
