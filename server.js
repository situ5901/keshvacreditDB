const mongoose = require("mongoose");
const figlet = require("figlet");
const app = require("./app");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { PORT, MONGODB_URI } = require("./config/config");
const sessionPath = path.join(__dirname, ".session-auth");
const SESSION_EXPIRY_HOURS = 0.5;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.stdoutMuted = true;

function askPassword() {
  return new Promise((resolve) => {
    rl.question("Enter password to start server: ", function(password) {
      rl.close();
      resolve(password);
    });

    rl._writeToOutput = function(stringToWrite) {
      if (rl.stdoutMuted) rl.output.write("*");
      else rl.output.write(stringToWrite);
    };
  });
}

function isSessionValid() {
  if (!fs.existsSync(sessionPath)) return false;

  try {
    const data = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
    const createdAt = new Date(data.authenticatedAt);
    const now = new Date();
    const hoursPassed = (now - createdAt) / (1000 * 60 * 60);
    return hoursPassed < SESSION_EXPIRY_HOURS;
  } catch {
    return false;
  }
}

async function main() {
  try {
    const chalkAnimation = await import("chalk-animation");
    const banner = await new Promise((resolve, reject) => {
      figlet("Situ-Kumar", (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    const rainbow = chalkAnimation.default.rainbow(banner);
    await new Promise((res) => setTimeout(res, 2500));

    console.log("Connecting to MongoDB...");

    if (!MONGODB_URI) {
      console.error("MONGODB_URI is undefined in .env");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("7: ❤️ Main Database Connected Successfully");


    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("Startup Error:", err.message);
    process.exit(1);
  }
}

main();
