const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URIVISH = process.env.MONGODB_URIVISH;

mongoose
  .connect(MONGODB_URIVISH)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);

const API_URL = "https://instantmudra.com/admin/API/Live_instantmudra";
const MAX_LEADS = 1;
const Partner_id = "Keshvacredit";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "api-key": "d70e2e18685f38708e175d780390d064ke58",
  };
}

async function sendToNewAPI(lead) {
  const response = {};
  const requestBody = {
    phone_no: lead.phone,
    email: lead.email,
    full_name: lead.name,
    gender: lead.gender,
    dob: lead.dob,
    pan_card_no: lead.pan,
    employement_type: lead.employment,
    salary: lead.income,
    pin_code: lead.pincode,
    partner_id: Partner_id,
  };

  console.log("📤 Sending Lead:", JSON.stringify(requestBody, null, 2));

  try {
    const apiResponse = await axios.post(API_URL, requestBody, {
      headers: getHeaders(),
    });

    response.status = apiResponse.status;
    response.msg = apiResponse.data.msg;
  } catch (error) {
    response.status = "failed";
    response.msg = error.response?.data?.msg || error.message;
  }

  return response;
}
//situ update//
async function processBatch(users) {
  const promises = users.map(async (user) => {
    const existingUser = await UserDB.findOne({
      phone: user.phone,
      "RefArr.name": "instantmudra",
    });

    if (existingUser) {
      console.log(
        `📞 ${user.phone} already processed for instantmudra, skipping...`,
      );
      return { status: "skipped", msg: "Already processed for instantmudra" };
    }

    return sendToNewAPI(user);
  });

  const results = await Promise.allSettled(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const result = results[i];

    const value =
      result.status === "fulfilled"
        ? result.value
        : {
            status: "failed",
            msg: result.reason?.message || "Unknown error",
          };

    console.log(`📞 ${user.phone} => 🧾`, value);

    if (value.status !== "skipped") {
      const updateResponse = await UserDB.updateOne(
        { phone: user.phone },
        {
          $push: {
            apiResponse: {
              instantmudra: value,
              createdAt: new Date().toISOString(),
            },
            RefArr: {
              name: "instantmudra",
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        },
      );

      console.log(`✅ Mongo Updated: ${user.phone}`, updateResponse);
    }
  }
}

let processedCount = 0;

async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads) {
      console.log("🔄 Fetching new leads...");

      const leads = await UserDB.aggregate([
        {
          $match: {
            "RefArr.name": { $ne: "instantmudra" },
          },
        },
        { $limit: MAX_LEADS },
      ]);

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        await processBatch(leads);
        processedCount += leads.length;
        console.log(`✅ Total Processed: ${processedCount}`);
      }
    }
  } catch (err) {
    console.error("🚨 Error in loop:", err.message);
  } finally {
    mongoose.connection.close();
  }
}

loop();
