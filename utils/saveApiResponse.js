const User = require("../models/user.model"); // adjust path if different

async function saveApiResponse(
  phone,
  partnerName,
  responseData,
  status = "success",
  message = "",
) {
  try {
    const user = await User.findOne({ phone });

    if (!user) {
      console.warn(`⚠️ No user found with phone: ${phone}`);
      return;
    }

    // Push API response details into accounts array
    user.accounts.push({
      name: partnerName,
      status,
      message,
      resp_date: new Date(), // ✅ FIXED HERE
      response: responseData,
    });

    await user.save();
    console.log(`✅ Saved ${partnerName} response for user ${phone}`);
  } catch (err) {
    console.error("❌ Error saving API response:", err);
  }
}

module.exports = { saveApiResponse };
