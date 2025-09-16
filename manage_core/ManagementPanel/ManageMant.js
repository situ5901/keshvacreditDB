const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const {
  MoneyView,
  MoneyView2,
  smcoll,
  dailyworks,
  LoanTaps,
} = require("../models/CheckLenderSchema");
const Apismcoll = require("../../models/apismcoll");

exports.dashboard = async (req, res) => {
  try {
    return res.json({ message: "Hello from Management panel" });
  } catch (error) {
    res.json({ message: error.message });
  }
};

exports.campianData = async (req, res) => {
  try {
    const MoneyView2 = await MoneyView.find(
      {
        "apiResponse.moneyViewDedupe.message": "No dedupe found",
      },
      {
        phone: 1,
        email: 1,
        pan: 1,
        _id: 0,
      },
    );

    const MVcount = await MoneyView.countDocuments({
      "apiResponse.moneyViewDedupe.message": "No dedupe found",
    });

    const Mpokket = await smcoll.aggregate([
      {
        $match: {
          "apiResponse.MpokketResponse.preApproval.message":
            "Data Accepted Successfully",
        },
      },
      {
        $project: {
          _id: 0,
          data: {
            requestId:
              "$apiResponse.MpokketResponse.preApproval.data.requestId",
            phone: "$phone", // root level phone
            name: "$name", // root level pan
          },
        },
      },
    ]);

    const Mpokket2 = await smcoll.countDocuments({
      "apiResponse.MpokketResponse.preApproval.message":
        "Data Accepted Successfully",
    });

    const SmartCoin = await smcoll.find(
      {
        "apiResponse.message": "Lead created successfully",
      },
      {
        phone: 1,
        pan: 1,
        _id: 0,
      },
    );

    const SmartCoin2 = await smcoll.countDocuments({
      "apiResponse.message": "Lead created successfully",
    });

    return res.json({
      message: "Hello from Management panel",
      MoneyView: {
        MVcount,
        Moneyview: MoneyView2,
      },
      Mpokket: {
        MpokketCampian: Mpokket,
        MpokketCount: Mpokket2,
      },
      SmartCoin: {
        SmartCoinCampian: SmartCoin,
        SmartCoinCount: SmartCoin2,
      },
    });
  } catch (error) {
    res.json({ message: error.message });
  }
};

exports.Managementlogin = (req, res) => {
  const { ManagementName, ManagementMail, ManagementPassword } = req.body;

  if (!ManagementMail || !ManagementPassword || !ManagementName) {
    return res.status(400).json({
      message: "❌ Management name, email, and password are required",
    });
  }

  const MamagementDataPath = path.join(
    __dirname,
    "../admin_panel/data/Managemantes.json",
  );

  if (!fs.existsSync(MamagementDataPath)) {
    return res.status(500).json({ message: "❌ Admin data file not found" });
  }

  let MamagementData;
  try {
    const fileContent = fs.readFileSync(MamagementDataPath, "utf-8");
    MamagementData = JSON.parse(fileContent);
  } catch (err) {
    return res.status(500).json({ message: "❌ Failed to read admin data" });
  }

  if (
    ManagementName === MamagementData.ManagementName &&
    ManagementMail === MamagementData.ManagementMail &&
    ManagementPassword === MamagementData.ManagementPassword
  ) {
    const token = jwt.sign(
      { role: "Management", username: ManagementName },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "24h" },
    );

    return res.json({
      role: "Management",
      message: "✅ Mamagement logged in",
      token,
    });
  } else {
    return res
      .status(401)
      .json({ message: "❌ Invalid Management credentials" });
  }
};

exports.CampiangData = async (req, res) => {
  try {
    const smartCoin = await Apismcoll.countDocuments();

    return res.json({
      message: "Campiang data fetched successfully",
      smartCoin,
    });
  } catch (error) {
    console.error("❌ Error fetching Campiang data:", error);
    res.status(500).json({ message: error.message });
  }
};
