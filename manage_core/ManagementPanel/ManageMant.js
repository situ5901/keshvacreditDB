const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const Apismcoll = require("../../models/apismcoll");
const router = require("express").Router();

// ---------------- DATABASE CONNECTIONS ----------------
const db1 = require("../ManagementPanel/MultiDataBase/GuniConDB");
const CVDB = require("../ManagementPanel/MultiDataBase/Cover_Vishu");
const ASHIJA_Vishu3 = require("../ManagementPanel/MultiDataBase/ASIJAVISHAL3");
const MONGODB_CML = require("../ManagementPanel/MultiDataBase/MONGODB_CML");
const MONGODB_RSUnity = require("../ManagementPanel/MultiDataBase/RSUnity");
const BlackCover = require("../ManagementPanel/MultiDataBase/BlackCover");

// ---------------- MODELS & SCHEMAS ----------------
const VishuDB =
  require("../ManagementPanel/MultiDataBase/MultiSchema/MultipalDBSchema")(db1);
const Dell =
  require("../ManagementPanel/MultiDataBase/MultiSchema/Cover_VishuDB")(CVDB);
const { MvcollCV, PaymeCV } =
  require("../ManagementPanel/MultiDataBase/MultiSchema/ASIJAVISHAL3Sch")(
    ASHIJA_Vishu3,
  );

const CML_Models =
  require("../ManagementPanel/MultiDataBase/MultiSchema/CMLSch")(MONGODB_CML);
const PersonalPayMe = CML_Models.PersonalPayMe;

const RS_Models =
  require("../ManagementPanel/MultiDataBase/MultiSchema/RSUnitySch")(
    MONGODB_RSUnity,
  );
const RSUnity = RS_Models.RSUnity;

const BlackCoverModels =
  require("../ManagementPanel/MultiDataBase/MultiSchema/BlackCoverSch")(
    BlackCover,
  );
const fatakPayModel = BlackCoverModels.fatakPayCOll;

// --- FIX: Hum uniform name use karenge 'LoanTapModel' ---
const LoanTapModel = BlackCoverModels.LoanTapCOll;

const {
  Loantap, // Ye purana model hai jo CreditSea ya PI ke liye use ho raha hai
  Delhi,
  MoneyView2,
  smcoll,
  PayMe2,
} = require("../models/CheckLenderSchema");

exports.campianData = async (req, res) => {
  try {
    if (!RSUnity) throw new Error("RSUnity Model not found.");
    if (!fatakPayModel) throw new Error("FatakPay Model not found in schema.");
    if (!LoanTapModel)
      throw new Error("LoanTapModel not found in BlackCover Schema.");

    // =================== 1. DATA FETCH (Find) ===================
    const [
      scUsers,
      scUsers2,
      dclUsers,
      plUsers,
      mpUsers,
      mpUsers2,
      zUsers,
      zUsers2,
      rfUsers,
      mv2Users,
      ltUsers,
      brUsers,
      chUsers,
      paymeUsers,
      payme2Users,
      piUsers,
      piUsers2,
      cfUsers,
      cfUsers2,
      sotUsers,
      cnUnityUsers,
      dcUsers,
      csUnityUsers,
    ] = await Promise.all([
      Dell.find(
        { "apiResponse.message": "Lead created successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      VishuDB.find(
        {
          "apiResponse.message": "Lead created successfully",
          "RefArr.name": "Smartcoin",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      fatakPayModel.find(
        { "apiResponse.FatakPayDCL.data.product_type": "CARD" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      fatakPayModel.find(
        { "apiResponse.FatakPayPL.data.product_type": "EMI" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      Dell.find(
        {
          "apiResponse.MpokketResponse.preApproval.message":
            "Data Accepted Successfully",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      VishuDB.find(
        {
          "RefArr.name": "Mpokket",
          "apiResponse.MpokketResponse.preApproval.message":
            "Data Accepted Successfully",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      Dell.find(
        { "apiResponse.ZypeResponse.status": "ACCEPT" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      VishuDB.find(
        { "RefArr.name": "Zype", "apiResponse.ZypeResponse.status": "ACCEPT" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      fatakPayModel.find(
        { "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      MoneyView2.find(
        { "apiResponse.moneyViewLeadSubmission.message": "success" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),

      LoanTapModel.find(
        {
          "apiResponse.LoanTap.fullResponse.message":
            "Application created successfully",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),

      Loantap.find(
        { "apiResponse.CreditSea.message": "Lead generated successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      Dell.find(
        {
          "apiResponse.CapitalNow.message":
            "Fresh Lead Registered Successfully!",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      smcoll.find(
        { "apiResponse.Branch.data.decision.code": 1 },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      Delhi.find(
        { "apiResponse.chintamani.message": "Profile created successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      PaymeCV.find(
        { "apiResponse.payme.register_user.message": "Signed-in Successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      PayMe2.find(
        { "apiResponse.payme.register_user.message": "Signed-in Successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      Loantap.find(
        {
          "apiResponse.PIResponse.status.message": "Lead created successfully",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      VishuDB.find(
        {
          "RefArr.name": "PI",
          "apiResponse.PIResponse.status.message": "Lead created successfully",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      MvcollCV.find(
        { "apiResponse.CreditFy.leadCreate.message": "SUCCESS" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      PersonalPayMe.find(
        { "apiResponse.CreditFy.leadCreate.message": "SUCCESS" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      RSUnity.find(
        {
          "RefArr.name": "SOT",
          "apiResponse.SOT.Message": "Lead generated successfully.",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      RSUnity.find(
        { "RefArr.name": "CapitalNow", "apiResponse.CapitalNow.code": 2005 },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      RSUnity.find(
        {
          "RefArr.name": "DigiCredit",
          "apiResponse.DigiCredit.leadCreate.message": "success",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      RSUnity.find(
        {
          "RefArr.name": "creditsea",
          "apiResponse.CreditSea.message": "Lead generated successfully",
        },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
    ]);

    // =================== 2. COUNTS FETCH ===================
    const [
      scS,
      scT,
      scP,
      scS2,
      scT2,
      scP2,
      dclS,
      dclT,
      dclP,
      plS,
      plT,
      plP,
      mpS,
      mpT,
      mpP,
      mpS2,
      mpT2,
      mpP2,
      zS,
      zT,
      zP,
      zS2,
      zT2,
      zP2,
      rfS,
      rfT,
      rfP,
      mvS,
      mvT,
      mvP,
      ltS,
      ltT,
      ltP,
      csS,
      csT,
      csP,
      cnS,
      cnT,
      cnP,
      brS,
      brT,
      brP,
      chS,
      chT,
      chP,
      pmS,
      pmT,
      pmP,
      pmS2,
      pmT2,
      pmP2,
      piS,
      piT,
      piP,
      piS2,
      piT2,
      piP2,
      cfS,
      cfT,
      cfP,
      cfS2,
      cfT2,
      cfP2,
      sotS,
      sotT,
      sotP,
      cnUS,
      cnUT,
      cnUP,
      dcS,
      dcT,
      dcP,
      csUS,
      csUT,
      csUP,
    ] = await Promise.all([
      Dell.countDocuments({
        "apiResponse.message": "Lead created successfully",
      }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Smartcoin" }),
      VishuDB.countDocuments({
        "apiResponse.message": "Lead created successfully",
        "RefArr.name": "Smartcoin",
      }),
      VishuDB.countDocuments({ "RefArr.name": "Smartcoin" }),
      VishuDB.countDocuments({ "RefArr.name": "Smartcoin" }),
      fatakPayModel.countDocuments({
        "apiResponse.FatakPayDCL.data.product_type": "CARD",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "FatakPayDCL" }),
      fatakPayModel.countDocuments({
        "apiResponse.FatakPayPL.data.product_type": "EMI",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "FatakPay" }),
      Dell.countDocuments({
        "apiResponse.MpokketResponse.preApproval.message":
          "Data Accepted Successfully",
      }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Mpokket" }),
      VishuDB.countDocuments({
        "RefArr.name": "Mpokket",
        "apiResponse.MpokketResponse.preApproval.message":
          "Data Accepted Successfully",
      }),
      VishuDB.countDocuments({ "RefArr.name": "Mpokket" }),
      VishuDB.countDocuments({ "RefArr.name": "Mpokket" }),
      Dell.countDocuments({ "apiResponse.ZypeResponse.status": "ACCEPT" }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Zype" }),
      VishuDB.countDocuments({
        "RefArr.name": "Zype",
        "apiResponse.ZypeResponse.status": "ACCEPT",
      }),
      VishuDB.countDocuments({ "RefArr.name": "Zype" }),
      VishuDB.countDocuments({ "RefArr.name": "Zype" }),
      fatakPayModel.countDocuments({
        "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "RamFin" }),
      MoneyView2.countDocuments({
        "apiResponse.moneyViewLeadSubmission.message": "success",
      }),
      MoneyView2.countDocuments(),
      MoneyView2.countDocuments({ "RefArr.name": "MoneyView" }),

      // --- FIX: LoanTap Counts from BlackCover ---
      LoanTapModel.countDocuments({
        "apiResponse.LoanTap.fullResponse.message":
          "Application created successfully",
      }),
      LoanTapModel.countDocuments(),
      LoanTapModel.countDocuments({ "RefArr.name": "LoanTap" }),

      // CreditSea (Using purana Loantap model)
      Loantap.countDocuments({
        "apiResponse.CreditSea.message": "Lead generated successfully",
      }),
      Loantap.countDocuments(),
      Loantap.countDocuments({ "RefArr.name": "creditsea" }),

      Dell.countDocuments({
        "apiResponse.CapitalNow.message": "Fresh Lead Registered Successfully!",
      }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "CapitalNow" }),
      smcoll.countDocuments({ "apiResponse.Branch.data.decision.code": 1 }),
      smcoll.countDocuments(),
      smcoll.countDocuments({ "RefArr.name": "Branch" }),
      Delhi.countDocuments({
        "apiResponse.chintamani.message": "Profile created successfully",
      }),
      Delhi.countDocuments(),
      Delhi.countDocuments({ "RefArr.name": "Chintamani" }),
      PaymeCV.countDocuments({
        "apiResponse.payme.register_user.message": "Signed-in Successfully",
      }),
      PaymeCV.countDocuments(),
      PaymeCV.countDocuments({ "RefArr.name": "payme" }),
      PayMe2.countDocuments({
        "apiResponse.payme.register_user.message": "Signed-in Successfully",
      }),
      PayMe2.countDocuments(),
      PayMe2.countDocuments({ "RefArr.name": "payme" }),
      Loantap.countDocuments({
        "apiResponse.PIResponse.status.message": "Lead created successfully",
      }),
      Loantap.countDocuments(),
      Loantap.countDocuments({ "RefArr.name": "PI" }),
      VishuDB.countDocuments({
        "RefArr.name": "PI",
        "apiResponse.PIResponse.status.message": "Lead created successfully",
      }),
      VishuDB.countDocuments({ "RefArr.name": "PI" }),
      VishuDB.countDocuments({ "RefArr.name": "PI" }),
      MvcollCV.countDocuments({
        "apiResponse.CreditFy.leadCreate.message": "SUCCESS",
      }),
      MvcollCV.countDocuments(),
      MvcollCV.countDocuments({ "RefArr.name": "CreditFy" }),
      PersonalPayMe.countDocuments({
        "apiResponse.CreditFy.leadCreate.message": "SUCCESS",
      }),
      PersonalPayMe.countDocuments(),
      PersonalPayMe.countDocuments({ "RefArr.name": "CreditFy" }),
      RSUnity.countDocuments({
        "RefArr.name": "SOT",
        "apiResponse.SOT.Message": "Lead generated successfully.",
      }),
      RSUnity.countDocuments(),
      RSUnity.countDocuments({ "RefArr.name": "SOT" }),
      RSUnity.countDocuments({
        "RefArr.name": "CapitalNow",
        "apiResponse.CapitalNow.code": 2005,
      }),
      RSUnity.countDocuments(),
      RSUnity.countDocuments({ "RefArr.name": "CapitalNow" }),
      RSUnity.countDocuments({
        "RefArr.name": "DigiCredit",
        "apiResponse.DigiCredit.leadCreate.message": "success",
      }),
      RSUnity.countDocuments(),
      RSUnity.countDocuments({ "RefArr.name": "DigiCredit" }),
      RSUnity.countDocuments({
        "RefArr.name": "creditsea",
        "apiResponse.CreditSea.message": "Lead generated successfully",
      }),
      RSUnity.countDocuments(),
      RSUnity.countDocuments({ "RefArr.name": "creditsea" }),
    ]);

    // =================== 3. JSON RESPONSE ===================
    return res.status(200).json({
      success: true,
      lender: {
        SmartCoin: { Success: scS, Processed: scP, Total: scT, users: scUsers },
        "SmartCoin2 ⛔": {
          Success: scS2,
          Processed: scP2,
          Total: scT2,
          users: scUsers2,
        },
        Mpokket: { Success: mpS, Processed: mpP, Total: mpT, users: mpUsers },
        Mpokket2: {
          Success: mpS2,
          Processed: mpP2,
          Total: mpT2,
          users: mpUsers2,
        },
        Zype: { Success: zS, Processed: zP, Total: zT, users: zUsers },
        Zype2: { Success: zS2, Processed: zP2, Total: zT2, users: zUsers2 },
        FatakPayDCL: {
          Success: dclS,
          Processed: dclP,
          Total: dclT,
          users: dclUsers,
        },
        FatakPayPL: {
          Success: plS,
          Processed: plP,
          Total: plT,
          users: plUsers,
        },
        "PayMe ⛔": {
          Success: pmS,
          Processed: pmP,
          Total: pmT,
          users: paymeUsers,
        },
        "PayMe 2 ⛔": {
          Success: pmS2,
          Processed: pmP2,
          Total: pmT2,
          users: payme2Users,
        },
        CreditFy: { Success: cfS, Processed: cfP, Total: cfT, users: cfUsers },
        CreditFy2: {
          Success: cfS2,
          Processed: cfP2,
          Total: cfT2,
          users: cfUsers2,
        },
        FiMoney: { Success: piS, Processed: piP, Total: piT, users: piUsers },
        FiMoney2: {
          Success: piS2,
          Processed: piP2,
          Total: piT2,
          users: piUsers2,
        },
        RamFinance: {
          Success: rfS,
          Processed: rfP,
          Total: rfT,
          users: rfUsers,
        },
        "MoneyView2 ⛔": {
          Success: mvS,
          Processed: mvP,
          Total: mvT,
          users: mv2Users,
        },
        LoanTaps: { Success: ltS, Processed: ltP, Total: ltT, users: ltUsers },
        "Branch ⛔": {
          Success: brS,
          Processed: brP,
          Total: brT,
          users: brUsers,
        },
        "Chintamani ⛔": {
          Success: chS,
          Processed: chP,
          Total: chT,
          users: chUsers,
        },
        SalaryOnTime: {
          Success: sotS,
          Processed: sotP,
          Total: sotT,
          users: sotUsers,
        },
        CapitalNow: {
          Success: cnUS,
          Processed: cnUP,
          Total: cnUT,
          users: cnUnityUsers,
        },
        DigiCredit: {
          Success: dcS,
          Processed: dcP,
          Total: dcT,
          users: dcUsers,
        },
        "CreditSea ⛔": {
          Success: csUS,
          Processed: csUP,
          Total: csUT,
          users: csUnityUsers,
        },
      },
    });
  } catch (error) {
    console.error("Campian Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

//FIX: =================== Management Login ===================
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
      { role: "harry", username: ManagementName },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "24h" },
    );

    return res.json({
      role: "harry",
      message: "✅ Mamagement logged in",
      token,
    });
  } else {
    return res
      .status(401)
      .json({ message: "❌ Invalid Management credentials" });
  }
};

//FIX: =================== Campaign Summary ===================
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

//FIX: =================== Dashboard ===================
exports.importData = async (req, res) => {
  try {
    const { collectionName, data: UserData } = req.body;

    if (!collectionName || !ModelMap[collectionName]) {
      return res.status(400).json({
        message: `Invalid or missing 'collectionName'. Must be one of: ${ValidCollections}`,
      });
    }

    const DynamicModel = ModelMap[collectionName];

    if (!Array.isArray(UserData) || UserData.length === 0) {
      return res.status(400).json({
        message: "Payload must be a non-empty array for bulk insertion.",
      });
    }

    const stringifiedUserData = UserData.map((record) => {
      const newRecord = { ...record };

      // **DOB Conversion Logic REMOVED from here**

      // Simple String Conversion for other fields
      const simpleFieldsToConvert = ["income", "pincode"];
      simpleFieldsToConvert.forEach((field) => {
        if (newRecord[field] !== null && newRecord[field] !== undefined) {
          if (typeof newRecord[field] !== "string") {
            newRecord[field] = String(newRecord[field]);
          }
        }
      });

      return newRecord;
    });

    const requiresDuplicateCheck =
      stringifiedUserData[0] &&
      stringifiedUserData[0].name &&
      stringifiedUserData[0].phone;

    let recordsToInsert = stringifiedUserData;
    let skippedCount = 0;

    if (requiresDuplicateCheck) {
      const existingRecords = await DynamicModel.find(
        {},
        { name: 1, phone: 1 },
      ).lean();
      const existingKeys = new Set(
        existingRecords.map((rec) => `${rec.name}::${rec.phone}`),
      );

      const filteredRecords = [];

      stringifiedUserData.forEach((data) => {
        const key = `${data.name}::${data.phone}`;
        if (existingKeys.has(key)) {
          skippedCount++;
        } else {
          filteredRecords.push(data);
          existingKeys.add(key);
        }
      });

      recordsToInsert = filteredRecords;
    }

    if (recordsToInsert.length === 0) {
      return res.json({
        message: `Bulk insertion skipped. All ${UserData.length} records were duplicates or invalid for insertion.`,
        insertedCount: 0,
        skippedCount: skippedCount,
        CollectionName: collectionName,
      });
    }

    const result = await DynamicModel.insertMany(recordsToInsert, {
      ordered: false,
    });

    return res.json({
      message: `Bulk insertion finished. Successfully inserted ${result.length} new records.`,
      insertedCount: result.length,
      skippedCount: skippedCount,
      CollectionName: collectionName,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during bulk insertion.",
      details: error.message,
    });
  }
};

exports.deleteImpData = async (req, res) => {
  try {
    const { collectionName } = req.body;

    if (!collectionName || !ModelMap[collectionName]) {
      return res.status(400).json({
        message: `Invalid or missing 'collectionName'. Must be one of: ${ValidCollections}`,
      });
    }

    const DynamicModel = ModelMap[collectionName];

    // 1. सभी दस्तावेज़ों को डिलीट करें
    const DeleteImpData = await DynamicModel.deleteMany({});

    return res.json({
      message: `Bulk deletion finished. Successfully deleted ${DeleteImpData.deletedCount} records.`,
      deletedCount: DeleteImpData.deletedCount,
      CollectionName: collectionName,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during bulk deletion.",
      details: error.message,
    });
  }
};

exports.ExportData = async (req, res) => {
  try {
    const { collectionName } = req.body;

    if (!collectionName || !ModelMap[collectionName]) {
      return res.status(400).json({
        message: `Invalid or missing 'collectionName'. Must be one of: ${ValidCollections}`,
      });
    }

    const DynamicModel = ModelMap[collectionName];

    // 1. सभी डेटा प्राप्त करें
    const ExportData = await DynamicModel.find({});

    return res.status(200).json({
      message: `Data from ${collectionName} exported successfully`,
      recordCount: ExportData.length,
      ExportData: ExportData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during data export.",
      details: error.message,
    });
  }
};

//FIX: =================== Delete Data ===================
exports.getAllCollData = async (req, res) => {
  try {
    const dellCount = await Dell.countDocuments();
    const payMeCount = await PayMe.countDocuments();
    const payMe2Count = await PayMe2.countDocuments();
    const zypeCount = await smcoll.countDocuments();

    return res.status(200).json({
      CollData: [
        { collection: "Dell", count: dellCount },
        { collection: "PayMe", count: payMeCount },
        { collection: "PayMe2", count: payMe2Count },
        { collection: "Zype", count: zypeCount },
      ],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during data retrieval.",
      details: error.message,
    });
  }
};
