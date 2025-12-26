const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const BATCH_SIZE = 11;
const CHECK_USER_API =
  "https://api.paymeindia.in/api/authentication/check_user_merchant/";
const REGISTER_USER_API =
  "https://api.paymeindia.in/api/authentication/register_user_merchant/";
const MERCHANT_ID = "5089aad2-e6ad-46f3-aef5-9a7f421f59de";
const REF_ARR_NAME = "payme";




const MONGODB_URINEW = process.env.ASIJAVISHAL3;

const UserDB = mongoose.model(
  "payme",
  new mongoose.Schema({}, { collection: "payme", strict: false }),
);



mongoose
  .connect(MONGODB_URINEW)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("🚫 MongoDB Connection Error:", err));


async function checkUser(user) {
  try {
    const lowerCaseEmail = user.email ? user.email.toLowerCase() : null;
    const payload = {
      email: lowerCaseEmail,
      merchant_id: MERCHANT_ID,
      pan_card_number: user.pan,
    };
    const response = await axios.post(CHECK_USER_API, payload);
    console.log(`✅ Check User Response for ${user.email}:`, response.data);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || { error: err.message };
    console.error(`❌ Check User Error for ${user.email}:`, errorData);
    return errorData;
  }
}

async function registerUser(user) {
  try {
    const lowerCaseEmail = user.email ? user.email.toLowerCase() : null;
    const payload = {
      email: lowerCaseEmail,
      merchant_id: MERCHANT_ID,
      phone_number: user.phone,
      full_name: user.name,
    };
    const response = await axios.post(REGISTER_USER_API, payload);
    console.log(`✅ Register User Response for ${user.phone}:`, response.data);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || { error: err.message };
    console.error(`❌ Register User Error for ${user.email}:`, errorData);
    return errorData;
  }
}

async function processBatch(users) {
  let successfullyRegisteredCount = 0;

  await Promise.allSettled(
    users.map(async (user) => {
      try {
        const userDoc = await UserDB.findOne({ phone: user.phone }).lean();
        if (!userDoc) {
          console.warn(
            `User with phone ${user.phone} not found in DB. Skipping operation.`,
          );
          return;
        }

        console.log(`\n🚀 Processing user: ${user.phone}`);

        const checkResponse = await checkUser(user);

        let registerResponse = null;

        const checkMessage = (checkResponse?.message || "")
          .toString()
          .toLowerCase();
        const checkError = (checkResponse?.error || "")
          .toString()
          .toLowerCase();

        const isUserFound =
          checkMessage.includes("user_found") ||
          checkError.includes("user already exist") ||
          checkMessage.includes("already registered");

        if (isUserFound) {
          console.log(
            `⚠️ User already exists on PayMe (Check API confirmed 'user_found' or equivalent): ${user.phone}`,
          );
        } else {
          registerResponse = await registerUser(user);
        }

        const apiResponsePayload = {
          [REF_ARR_NAME]: {
            check_user: checkResponse,
            register_user: registerResponse,
          },
          createdAt: new Date().toISOString(),
        };

        const updateOperation = {
          $push: {
            apiResponse: apiResponsePayload,
          },
          $addToSet: {
            RefArr: {
              name: REF_ARR_NAME,
              createdAt: new Date().toISOString(),
            },
          },
          $unset: { accounts: "" },
        };

        await UserDB.updateOne({ _id: userDoc._id }, updateOperation);
        console.log(`✅ Database updated for user: ${user.phone}`);

        if (registerResponse && registerResponse.status === true) {
          successfullyRegisteredCount++;
          console.log(`⭐ User Registered Successfully for: ${user.phone}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to process user ${user.phone} in batch:`,
          error.message,
        );
      }
    }),
  );

  return successfullyRegisteredCount;
}


function delay(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function main() {
  let totalRegisteredSuccessfully = 0;
  let skip = 0;
  let hasMoreUsers = true;

  console.log("🚦 Starting user processing for PayMe (Batch loop started)...");

  try {
    while (hasMoreUsers) {
      const users = await UserDB.find({
        $or: [
          { RefArr: { $exists: false } },
          { "RefArr.name": { $ne: REF_ARR_NAME } },
        ],
      })
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (users.length === 0) {
        hasMoreUsers = false;
        break;
      }

      const batchRegisteredCount = await processBatch(users);

      console.log(
        `\n📊 Batch Completed. Processed ${users.length} users. ${batchRegisteredCount} registered successfully.`,
      );
      totalRegisteredSuccessfully += batchRegisteredCount;
      console.log("⏳ Waiting 2 seconds before next batch...");
      await delay(3000);
      skip += users.length;
    }

    console.log("--------------------------------------------------");
    console.log("✅ All batches processed.");
    console.log(
      `🎯 Total Users Registered Successfully with PayMe: ${totalRegisteredSuccessfully}`,
    );
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("❌ Fatal error during main processing:", error);
  } finally {
    mongoose.disconnect();
    console.log("🔌 MongoDB connection closed.");
  }
}

main();

