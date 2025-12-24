require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");

const MONGODB_URINEW = process.env.MONGODB_RSUnity;

mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "smcoll",
  new mongoose.Schema({}, { collection: "smcoll", strict: false }),
);
const MAX_LEADS = 10; 

const AUTH_URL = "https://cmservice.creditmantri.com/anumathi/a";
const CREATE_URL = "https://cmservice.creditmantri.com/anumathi/lenderbase/keshvacredit/store-data";
const AES_KEY = "z71VoFju4p1Xc91QLLu1MBsp0dlW1Dcr";

const CLIENT_HEADERS = {
    source: "keshvacredit",
    clientId: "ZTYpC0/DN32p0clnHoSeyw==",
    secretKey: "wbYBzR4cgJjCUZbO5mPIzXAQILU5y3iKziIxcIml4LI=",
    "Content-Type": "application/json",
};

if (!MONGODB_URINEW) {
    console.error("🚫 Error: ASIJAVISHAL3 environment variable is not defined.");
    process.exit(1);
}


function encryptPayload(payload) {
    const key = Buffer.from(AES_KEY, "utf8");
    const cipher = crypto.createCipheriv("aes-256-ecb", key, null);
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
}

function decryptPayload(encryptedBase64) {
    const key = Buffer.from(AES_KEY, "utf8");
    const decipher = crypto.createDecipheriv("aes-256-ecb", key, null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedBase64, "base64", "utf8");
    decrypted += decipher.final("utf8");
    try {
        return JSON.parse(decrypted);
    } catch (e) {
        return decrypted;
    }
}

async function getAccessToken() {
    try {
        const resp = await axios.post(AUTH_URL, {}, { headers: CLIENT_HEADERS, timeout: 10000 });
        const token = resp.headers && resp.headers["key"];
        if (!token) throw new Error("Auth token missing");
        return token;
    } catch (err) {
        throw err;
    }
}

async function sendToCreditMantri(payload) {
    const encrypted = encryptPayload(payload);
    const token = await getAccessToken();

    try {
        const resp = await axios.post(
            CREATE_URL,
            Buffer.from(encrypted, "utf8"),
            {
                headers: {
                    key: token,
                    source: "keshvacredit",
                    "api-version": "v1",
                    "Content-Type": "application/json"
                },
                timeout: 15000,
            }
        );

        console.log("------------------------------------------");
        console.log("📡 [RAW API RESPONSE]:", JSON.stringify(resp.data));

        let finalResult;
        if (resp.data && resp.data.data) {
            finalResult = decryptPayload(resp.data.data);
        } else if (typeof resp.data === "string") {
            finalResult = decryptPayload(resp.data);
        } else {
            finalResult = resp.data;
        }

        console.log("🔓 [DECRYPTED RESPONSE]:", JSON.stringify(finalResult, null, 2));
        console.log("------------------------------------------");
        return finalResult;

    } catch (err) {
        const errorData = err.response ? err.response.data : { error: err.message };
        console.error("❌ [API ERROR]:", JSON.stringify(errorData));
        return errorData;
    }
}

async function processBatch(users) {
    const promises = users.map(async (user) => {
        const phone = user.phone || user.mobile;

        const payload = {
            mobile: phone,
            first_name: user.first_name || user.name || "Customer",
            last_name: user.last_name || "kumar",
            pan: user.pan || "",
            dob: user.dob || "1990-01-01",
            email: user.email || "",
            gender: user.gender || "Male",
            pincode: user.pincode || "",
            income: String(user.income || "0"),
            employment_type: user.employment_type || user.employment || "Salaried",
            customer_consent_flag: 1,
            customer_consent_timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
            residential_pincode: user.pincode || "",
            lender: "keshvacredit",
            Segment: "null",
            marital_status: user.marital_status || ""
        };

        try {
            console.log(`🚀 Sending Lead: ${phone}`);
            const apiResult = await sendToCreditMantri(payload);

            await UserDB.updateOne(
                { _id: user._id },
                {
                    $push: {
                        apiResponse: {
                            CreditMantri: apiResult,
                            createdAt: new Date().toLocaleString(),
                        },
                        RefArr: {
                            name: "CreditMantri",
                            status: "Sent",
                            createdAt: new Date().toLocaleString(),
                        },
                    },
                    $unset: { accounts: "" }
                }
            );
            console.log(`💾 DB Updated for: ${phone}`);
        } catch (err) {
            console.error(`❌ DB Update Error for ${phone}:`, err.message);
        }
    });

    await Promise.all(promises);
}

async function loop() {
    try {
        let hasMore = true;
        while (hasMore) {
            const leads = await UserDB.aggregate([
                {
                    $match: {
                        processed: { $ne: true },
                        "RefArr.name": { $ne: "CreditMantri" },
                    },
                },
                { $limit: MAX_LEADS },
            ]);

            if (leads.length === 0) {
                hasMore = false;
                console.log("🏁 No leads found. Process Finished.");
            } else {
                await processBatch(leads);
                await new Promise((r) => setTimeout(r, 1000));
            }
        }
    } catch (error) {
        console.error("🚫 Loop Crash:", error.message);
    } finally {
        mongoose.connection.close();
        console.log("🔌 Connection Closed.");
    }
}

loop();
