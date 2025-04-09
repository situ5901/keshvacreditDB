const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));

// const UserDB = mongoose.model(
//   "userdb",
//   new mongoose.Schema({}, { strict: false }),
// );

const TestDB = mongoose.model(
  "Test",
  new mongoose.Schema({}, { collection: "Test", strict: false }),
);
const BATCH_SIZE = 50;
const newAPI =
  "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";

const MAX_LEADS = 50000;
const Partner_id = "Keshvacredit";
const loanAmount = 20000;
let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    // ✅ DOB Formatter Function
    // ✅ Date formatter to convert MM/DD/YYYY or DD/MM/YYYY → YYYY-MM-DD
    const formatDOB = (dob) => {
      if (!dob) return "";

      // Try parsing MM/DD/YYYY or DD/MM/YYYY
      const parts = dob.split(/[\/\-]/); // supports '/' or '-' as separator
      if (parts.length === 3) {
        let day, month, year;

        // Guessing based on value
        if (parseInt(parts[0]) > 12) {
          // probably DD/MM/YYYY
          [day, month, year] = parts;
        } else {
          // probably MM/DD/YYYY
          [month, day, year] = parts;
        }

        // Ensure all parts are 2-digit except year
        if (year.length === 2) {
          year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
        }

        // Pad single digit month/day
        if (month.length === 1) month = `0${month}`;
        if (day.length === 1) day = `0${day}`;

        return `${year}-${month}-${day}`;
      }

      return dob; // fallback
    };

    // ✅ Lead Data Formatting
    const mobile = lead.phone;
    const name = lead.Name?.trim();
    const email = lead.email?.toLowerCase();
    const employeeType = lead.employeeType;
    const dobRaw = lead.dob;
    const pancard = lead.pan?.toUpperCase();

    const dob = formatDOB(dobRaw); // 👈 Convert to YYYY-MM-DD

    const apiRequestBody = {
      mobile: String(mobile),
      name: name,
      email: email,
      employeeType: employeeType,
      dob: dob, // ✅ Proper format
      pancard: pancard,
      loanAmount: loanAmount,
      partnerId: Partner_id,
    };

    console.log("Sending Lead Data to API:", apiRequestBody);

    const apiResponse = await axios.post(newAPI, apiRequestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic cmFtZmluX2U2NmIxNmE5ZjZiNzQ5YTAzOTBmZWRjM2U4ZjNkZjZmOmI3YjJlZDU1MjM5NjA5NzM5NmQwOWE2N2RkZTI4NjUyMDNjZDMxYjA=",
      },
    });

    response.status = apiResponse.data?.status || "success";
    response.message =
      apiResponse.data?.message || "Lead processed successfully";
  } catch (error) {
    response.status = "failed";
    response.message =
      error.response?.data?.message || error.message || "Unknown error";
  }
  return response;
}

async function processBatch(users) {
  const promises = users.map((user) => sendToNewAPI(user));
  const results = await Promise.all(promises);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const response = results[i];

    console.log("User:", user.phone, "Response:", response);

    const updateResponse = await TestDB.updateOne(
      { phone: user.phone },
      {
        $push: {
          apiResponse: {
            // ✅ New API response will be added instead of replacing
            status: response.status,
            message: response.message,
            createdAt: new Date().toISOString(),
          },
          refArr: {
            name: "RamFin",
            createdAt: new Date().toISOString(),
          }, // ✅ New entry in refArr
        },
        $unset: { accounts: "" },
      },
    );

    console.log(`Update Response for ${user.phone}:`, updateResponse);
  }
}

async function loop() {
  try {
    let hasMoreLeads = true;

    while (hasMoreLeads && processedCount < MAX_LEADS) {
      console.log("🔄 Fetching users...");

      const leads = await TestDB.aggregate([
        {
          $match: {
            "refArr.name": { $ne: "RamFin" }, 
          },
        },
        { $limit: 50000 },
      ]);
      

      if (leads.length === 0) {
        hasMoreLeads = false;
        console.log("🚫 No more leads to process.");
      } else {
        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
          const batch = leads.slice(i, i + BATCH_SIZE);
          await processBatch(batch);
          processedCount += batch.length;
          console.log(`Processed ${processedCount} leads.`);

          if (processedCount >= MAX_LEADS) {
            console.log("✅ Reached the limit of 8000 leads.");
            hasMoreLeads = false;
            break;
          }

          // ✅ Wait 3 seconds after processing each batch
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  } catch (error) {
    console.error("🚫 Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

loop();