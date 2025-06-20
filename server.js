const mongoose = require("mongoose");
const figlet = require("figlet");
const app = require("./app");
const { PORT, MONGODB_URI } = require("./config/config");

mongoose.set("strictQuery", false);

async function main() {
  try {
    // ✅ Import chalk-animation dynamically here
    const chalkAnimation = await import("chalk-animation");

    // 🎨 Render fancy banner
    const data = await new Promise((resolve, reject) => {
      figlet("Situ-Kumar", (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const rainbow = chalkAnimation.default.rainbow(data);
    await new Promise((res) => setTimeout(res, 3500));

    console.log("🛜 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("🎉 Database Connected Successfully 🎉");

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("❌ Startup Error:", err.message);
    process.exit(1);
  }
}

main();
