const crypto = require("crypto");
const axios = require("axios");

const API_URL = "https://dev-tsp-los.lendenclub.com/v2";
const KEY = "03f4e9c37121bbe88545b5a06cd7e619"; // 32 bytes
const IV = "47ed667825c963ab"; // 16 bytes
const PARTNER_CODE = "LKC";
const AUTH_TOKEN = "e70783bb76614b48a9299c77367748";
const API_CODE = "CREATE_LEAD_API_V2";
const AES_BLOCK_SIZE = 32;

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
      address_line: "charni Road",
      pincode: 400009,
    },
    professional_details: {
      occupation_type: "SALARIED",
      income: 30000,
    },
  },
  api_code: API_CODE,
};

// ✅ Padding function
function pad(data) {
  const buffer = Buffer.from(data, "utf8");
  const padding = AES_BLOCK_SIZE - (buffer.length % AES_BLOCK_SIZE);
  const padded = Buffer.concat([buffer, Buffer.alloc(padding, padding)]);
  return padded;
}

// ✅ Unpadding function
function unpad(data) {
  const padding = data[data.length - 1];
  return data.slice(0, -padding);
}

// ✅ AES Encryption
function encryptAES(plainText, key, iv) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8"),
  );
  const padded = pad(plainText);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  return encrypted.toString("base64");
}

// ✅ AES Decryption
function decryptAES(encryptedText, key, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8"),
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]);
  const unpadded = unpad(decrypted);
  return unpadded.toString("utf8");
}

// ✅ SHA256 Checksum
function generateChecksum(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ✅ Send API Request
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

    if (response.data.payload) {
      const decrypted = decryptAES(response.data.payload, KEY, IV);
      console.log(
        "🔓 Decrypted Response:\n",
        JSON.stringify(JSON.parse(decrypted), null, 2),
      );
    } else {
      console.log("📡 Response:\n", JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response?.data) {
      console.error(
        "📡 Error Response:",
        JSON.stringify(error.response.data, null, 2),
      );
    }
  }
}

// ✅ Run main
sendLeadRequest();
