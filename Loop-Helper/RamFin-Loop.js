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

const UserDB = mongoose.model(
  "userdb",
  new mongoose.Schema({}, { collection: "userdb", strict: false }),
);
const BATCH_SIZE = 2;
const newAPI =
  "https://www.ramfincorp.com/loanapply/ramfincorp_api/lead_gen/api/v1/create_lead";


const MAX_LEADS = 5000;
const Partner_id = "Keshvacredit";
const loanAmount = 20000;
let processedCount = 0;

async function sendToNewAPI(lead) {
  let response = {};
  try {
    const mobile = lead.phone;
    const name = lead.name;
    const email = lead.email;
    const employeeType = lead.employment;
    const dob = lead.dob;
    const pancard = lead.pan;

    const apiRequestBody = {
      mobile: mobile,
      name: name,
      email: email,
      employeeType: employeeType,
      dob: dob,
      pancard: pancard,
      loanAmount: loanAmount,
      Partner_id: Partner_id,
      // loanAmount: loanAmount,
    };

    console.log(
      "Sending Lead Data to API:",
      JSON.stringify(apiRequestBody, null, 2),
    );

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

    const updateResponse = await UserDB.updateOne(
      { phone: user.phone },
      {
        $set: {
          processed: true,
          "apiResponse.status": response.status,
          "apiResponse.message": response.message,
          "apiResponse.Ramfin": true,
          createAt: new Date().toISOString(),
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

      const leads = await UserDB.aggregate([
        {
          $match: { processed: { $ne: true }, apiResponse: { $exists: false } },
        },
        { $limit: 5000 },
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
            console.log("✅ Reached the limit of 10 leads.");
            hasMoreLeads = false;
            break;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error("🚫 Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

loop();

// const axios = require("axios");
// const mongoose = require("mongoose");
// require("dotenv").config();
//
// const MONGODB_URI = process.env.MONGODB_URI;
//
// // ✅ Connect to MongoDB
// mongoose
//   .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log("✅ MongoDB Connected Successfully"))
//   .catch((err) => console.error("🚫 MongoDB Connection Error:", err));
//
// const UserDB = mongoose.model(
//   "userdb",
//   new mongoose.Schema({}, { collection: "userdb", strict: false }),
// );
//
// const BATCH_SIZE = 1;
// const newAPI = "https://abcd-vvd2.onrender.com/api/data";
// const MAX_LEADS = 2;
// const Partner_id = "Keshvacredit";
//
// let processedCount = 0;
//
// // ✅ Function to Send Data to API
// async function sendToNewAPI(lead) {
//   let response = {};
//   try {
//     const apiRequestBody = {
//       mobile: lead.phone,
//       name: lead.Name,
//       Partner_id: Partner_id,
//     };
//
//     console.log(
//       "📤 Sending Lead Data to API:",
//       JSON.stringify(apiRequestBody, null, 2),
//     );
//
//     const apiResponse = await axios.post(newAPI, apiRequestBody, {
//       headers: { "Content-Type": "application/json" },
//     });
//
//     response.status = apiResponse.data?.status || "success";
//     response.message =
//       apiResponse.data?.message || "Lead processed successfully";
//   } catch (error) {
//     response.status = "failed";
//     response.message =
//       error.response?.data?.message || error.message || "Unknown error";
//   }
//   return response;
// }
//
// // ✅ Function to Process Leads in Batches
// async function processBatch(users) {
//   const promises = users.map((user) => sendToNewAPI(user));
//   const results = await Promise.all(promises);
//
//   for (let i = 0; i < users.length; i++) {
//     const user = users[i];
//     const response = results[i];
//
//     console.log(`📞 User: ${user.phone} | Response:`, response);
//
//     const updateResponse = await UserDB.updateOne(
//       { phone: user.phone },
//       {
//         $set: {
//           processed: true,
//           "apiResponse.status": response.status,
//           "apiResponse.message": response.message,
//           ranfin: true,
//           createAt: new Date().toISOString(),
//         },
//         $unset: { accounts: "" },
//       },
//     );
//
//     // console.log(`✅ Update Response for ${user.phone}:`, updateResponse);
//   }
// }
//
// // ✅ Function to Fetch Leads and Process
// async function loop() {
//   try {
//     let hasMoreLeads = true;
//
//     while (hasMoreLeads && processedCount < MAX_LEADS) {
//       console.log("🔄 Fetching users...");
//
//       const leads = await UserDB.aggregate([
//         {
//           $match: {
//             $or: [{ processed: { $exists: false } }, { processed: false }],
//           },
//         },
//         { $limit: 2 },
//       ]);
//
//       if (leads.length === 0) {
//         hasMoreLeads = false;
//         console.log("🚫 No more leads to process.");
//       } else {
//         for (let i = 0; i < leads.length; i += BATCH_SIZE) {
//           const batch = leads.slice(i, i + BATCH_SIZE);
//           await processBatch(batch);
//           processedCount += batch.length;
//           console.log(`✅ Processed ${processedCount} leads.`);
//           if (processedCount >= MAX_LEADS) {
//             console.log("🎯 Reached the limit of leads.");
//             hasMoreLeads = false;
//             break;
//           }
//         }
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }
//   } catch (error) {
//     console.error("🚫 Error:", error);
//   } finally {
//     mongoose.connection.close();
//   }
// }
//
// // ✅ Debugging: Check if Data Exists Before Running Loop
// async function debugDatabase() {
//   const sampleUser = await UserDB.findOne();
//   console.log("🔍 Sample User from DB:", sampleUser);
//
//   const count = await UserDB.countDocuments({
//     processed: { $ne: true },
//     apiResponse: { $exists: false },
//   });
//   console.log(`📊 Total Unprocessed Leads Found: ${count}`);
//
//   if (count > 0) {
//     loop();
//   } else {
//     console.log("🚫 No unprocessed leads found. Exiting.");
//     mongoose.connection.close();
//   }
// }
//
// // Run Debug Check Before Loop
// debugDatabase();
