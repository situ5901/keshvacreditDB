const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const Apismcoll = require("../../models/apismcoll");
const router = require("express").Router();

const db1 = require("../ManagementPanel/MultiDataBase/GuniConDB");

const VishuDB = require("../ManagementPanel/MultiDataBase/MultipalDBSchema")(db1);


// =================== CLEAN IMPORT BLOCK ===================
const {
  Dell,
  Mvcoll,
  Zype,
  Loantap,
  Delhi,
  MoneyView,
  MoneyView2,
  smcoll,
  PayMe,
  PayMe2,
  Ramfin
} = require("../models/CheckLenderSchema");

const ModelMap = {
  Dell: Dell,
  Mvcoll: Mvcoll,
  Zype: Zype,
  Loantap: Loantap,
  Delhi: Delhi,
  MoneyView: MoneyView,
  MoneyView2: MoneyView2,
  smcoll: smcoll,
  PayMe: PayMe,
  PayMe2: PayMe2,
  Ramfin: Ramfin
};

const ValidCollections = Object.keys(ModelMap).join(', ');




// =================== Management Login ===================
exports.Managementlogin = (req, res) => {
  const { ManagementName, ManagementMail, ManagementPassword } = req.body;

  if (!ManagementMail || !ManagementPassword || !ManagementName) {
    return res.status(400).json({
      message: "❌ Management name, email, and password are required",
    });
  }

  const MamagementDataPath = path.join(
    __dirname,
    "../admin_panel/data/Managemantes.json"
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
    return res.status(401).json({ message: "❌ Invalid Management credentials" });
  }
};


// =================== Campaign Summary ===================
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



// =================== Dashboard ===================
exports.importData = async (req, res) => {
  try {
    const { collectionName, data: UserData } = req.body;

    if (!collectionName || !ModelMap[collectionName]) {
      return res.status(400).json({
        message: `Invalid or missing 'collectionName'. Must be one of: ${ValidCollections}`
      });
    }

    const DynamicModel = ModelMap[collectionName];

    if (!Array.isArray(UserData) || UserData.length === 0) {
      return res.status(400).json({
        message: "Payload must be a non-empty array for bulk insertion."
      });
    }

    const stringifiedUserData = UserData.map(record => {
      const newRecord = { ...record };

      // **DOB Conversion Logic REMOVED from here**

      // Simple String Conversion for other fields
      const simpleFieldsToConvert = ['income', 'pincode'];
      simpleFieldsToConvert.forEach(field => {
        if (newRecord[field] !== null && newRecord[field] !== undefined) {
          if (typeof newRecord[field] !== 'string') {
            newRecord[field] = String(newRecord[field]);
          }
        }
      });

      return newRecord;
    });

    const requiresDuplicateCheck = stringifiedUserData[0] && stringifiedUserData[0].name && stringifiedUserData[0].phone;

    let recordsToInsert = stringifiedUserData;
    let skippedCount = 0;

    if (requiresDuplicateCheck) {
      const existingRecords = await DynamicModel.find({}, { name: 1, phone: 1, }).lean();
      const existingKeys = new Set(
        existingRecords.map(rec => `${rec.name}::${rec.phone}`)
      );

      const filteredRecords = [];

      stringifiedUserData.forEach(data => {
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
        CollectionName: collectionName
      });
    }

    const result = await DynamicModel.insertMany(recordsToInsert, { ordered: false });

    return res.json({
      message: `Bulk insertion finished. Successfully inserted ${result.length} new records.`,
      insertedCount: result.length,
      skippedCount: skippedCount,
      CollectionName: collectionName
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
        message: `Invalid or missing 'collectionName'. Must be one of: ${ValidCollections}`
      });
    }

    const DynamicModel = ModelMap[collectionName];

    // 1. सभी दस्तावेज़ों को डिलीट करें
    const DeleteImpData = await DynamicModel.deleteMany({});

    return res.json({
      message: `Bulk deletion finished. Successfully deleted ${DeleteImpData.deletedCount} records.`,
      deletedCount: DeleteImpData.deletedCount,
      CollectionName: collectionName
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during bulk deletion.",
      details: error.message,
    });
  }
}

exports.ExportData = async (req, res) => {
  try {
    const { collectionName } = req.body;

    if (!collectionName || !ModelMap[collectionName]) {
      return res.status(400).json({
        message: `Invalid or missing 'collectionName'. Must be one of: ${ValidCollections}`
      });
    }

    const DynamicModel = ModelMap[collectionName];

    // 1. सभी डेटा प्राप्त करें
    const ExportData = await DynamicModel.find({})

    return res.status(200).json({
      message: `Data from ${collectionName} exported successfully`,
      recordCount: ExportData.length,
      ExportData: ExportData
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during data export.",
      details: error.message,
    });
  }
}





// =================== Delete Data ===================
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
        { collection: "Zype", count: zypeCount }
      ]
    });

  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error during data retrieval.",
      details: error.message,
    });
  }
}




exports.campianData = async (req, res) => {
  try {
    const [
      scUsers, scUsers2,
      dclUsers, plUsers,

      mpUsers, mpUsers2,
      zUsers, zUsers2,

      rfUsers,
      mv2Users,
      ltUsers,
      csUsers,
      cnUsers,
      brUsers,
      chUsers,

      paymeUsers,
      payme2Users,
      piUsers, // <-- Added comma
      piUsers2, // <-- Corrected spacing
      CreditFy,
    ] = await Promise.all([

      VishuDB.find({ "apiResponse.message": "Lead created successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }), // <<-- Zype से VishuDB में बदला गया
      Dell.find({ "apiResponse.message": "Lead created successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Mvcoll.find({ "apiResponse.FatakPayDCL.data.product_type": "CARD" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),
      Mvcoll.find({ "apiResponse.FatakPayPL.data.product_type": "EMI" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Dell.find({ "apiResponse.MpokketResponse.preApproval.message": "Data Accepted Successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),
      VishuDB.find({ "apiResponse.MpokketResponse.preApproval.message": "Data Accepted Successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }), // <<-- Zype से VishuDB में बदला गया

      VishuDB.find({ "apiResponse.ZypeResponse.status": "ACCEPT" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }), // <<-- Zype से VishuDB में बदला गया
      Dell.find({ "apiResponse.ZypeResponse.status": "ACCEPT" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Ramfin.find({ "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      MoneyView2.find({ "apiResponse.moneyViewLeadSubmission.message": "success" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Loantap.find({ "apiResponse.LoanTap.fullResponse.message": "Application created successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Loantap.find({ "apiResponse.CreditSea.message": "Lead generated successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Dell.find({ "apiResponse.CapitalNow.message": "Fresh Lead Registered Successfully!" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      smcoll.find({ "apiResponse.Branch.data.decision.code": 1 }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      Delhi.find({ "apiResponse.chintamani.message": "Profile created successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),

      PayMe.find(
        { "apiResponse.payme.register_user.message": "Signed-in Successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }
      ),

      PayMe2.find(
        { "apiResponse.payme.register_user.message": "Signed-in Successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }
      ),

      Loantap.find({ "apiResponse.PIResponse.status.message": "Lead created successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),
      VishuDB.find({ "apiResponse.PIResponse.status.message": "Lead created successfully" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }), // The second PI find
      Delhi.find({ "apiResponse.CreditFy.leadCreate.message": "SUCCESS" }, { phone: 1, email: 1, pan: 1, name: 1, _id: 0 }),
    ]);


    // 2. Array destructuring in the second Promise.all:
    // Fixed the missing comma after 'piProcessed'.
    const [
      scSuccess, scTotal, scProcessed,
      scSuccess2, scTotal2, scProcessed2,

      dclSuccess, dclTotal, dclProcessed,
      plSuccess, plTotal, plProcessed,

      mpSuccess, mpTotal, mpProcessed,
      mpSuccess2, mpTotal2, mpProcessed2,

      zSuccess, zTotal, zProcessed,
      zSuccess2, zTotal2, zProcessed2,

      rfSuccess, rfProcessed, rfTotal,

      mv2Success, mv2Total, mv2Processed,

      ltSuccess, ltProcessed, ltTotal,

      csSuccess, csTotal, csProcessed,

      cnSuccess, cnTotal, cnProcessed,

      brSuccess, brTotal, brProcessed,

      chSuccess, chTotal, chProcessed,

      paymeSuccess, paymeTotal, paymeProcessed,

      payme2Success, payme2Total, payme2Processed,

      piSuccess, piTotal, piProcessed, // <-- Added comma
      pi2Success, pi2Total, pi2Processed,
      cfSuccess, cfTotal, cfProcessed, cfUsers
    ] = await Promise.all([

      VishuDB.countDocuments({ "apiResponse.message": "Lead created successfully" }), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments(), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments({ "RefArr.name": "Smartcoin" }), // <<-- Zype से VishuDB में बदला गया

      Dell.countDocuments({ "apiResponse.message": "Lead created successfully" }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Smartcoin" }),

      Mvcoll.countDocuments({ "apiResponse.FatakPayDCL.data.product_type": "CARD" }),
      Mvcoll.countDocuments(),
      Mvcoll.countDocuments({ "RefArr.name": "FatakPayDCL" }),

      Mvcoll.countDocuments({ "apiResponse.FatakPayPL.data.product_type": "EMI" }),
      Mvcoll.countDocuments(),
      Mvcoll.countDocuments({ "RefArr.name": "FatakPay" }),

      Dell.countDocuments({ "apiResponse.MpokketResponse.preApproval.message": "Data Accepted Successfully" }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Mpokket" }),

      VishuDB.countDocuments({ "apiResponse.MpokketResponse.preApproval.message": "Data Accepted Successfully" }), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments(), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments({ "RefArr.name": "Mpokket" }), // <<-- Zype से VishuDB में बदला गया

      VishuDB.countDocuments({ "apiResponse.ZypeResponse.status": "ACCEPT" }), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments(), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments({ "RefArr.name": "Zype" }), // <<-- Zype से VishuDB में बदला गया

      Dell.countDocuments({ "apiResponse.ZypeResponse.status": "ACCEPT" }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Zype" }),

      Ramfin.countDocuments({ "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully" }),
      Ramfin.countDocuments({ "RefArr.name": "RamFin" }),
      Ramfin.countDocuments(),

      MoneyView2.countDocuments({ "apiResponse.moneyViewLeadSubmission.message": "success" }),
      MoneyView2.countDocuments(),
      MoneyView2.countDocuments({ "RefArr.name": "MoneyView" }),

      Loantap.countDocuments({ "apiResponse.LoanTap.fullResponse.message": "Application created successfully" }),
      Loantap.countDocuments({ "RefArr.name": "LoanTap" }),
      Loantap.countDocuments(),

      Loantap.countDocuments({ "apiResponse.CreditSea.message": "Lead generated successfully" }),
      Loantap.countDocuments(),
      Loantap.countDocuments({ "RefArr.name": "creditsea" }),

      Dell.countDocuments({ "apiResponse.CapitalNow.message": "Fresh Lead Registered Successfully!" }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "CapitalNow" }),

      smcoll.countDocuments({ "apiResponse.Branch.data.decision.code": 1 }),
      smcoll.countDocuments(),
      smcoll.countDocuments({ "RefArr.name": "Branch" }),

      Delhi.countDocuments({ "apiResponse.chintamani.message": "Profile created successfully" }),
      Delhi.countDocuments(),
      Delhi.countDocuments({ "RefArr.name": "Chintamani" }),

      PayMe.countDocuments({ "apiResponse.payme.register_user.message": "Signed-in Successfully" }),
      PayMe.countDocuments(),
      PayMe.countDocuments({ "RefArr.name": "payme" }),

      PayMe2.countDocuments({ "apiResponse.payme.register_user.message": "Signed-in Successfully" }),
      PayMe2.countDocuments(),
      PayMe2.countDocuments({ "RefArr.name": "payme" }),

      Loantap.countDocuments({ "apiResponse.PIResponse.status.message": "Lead created successfully" }),
      Loantap.countDocuments(),
      Loantap.countDocuments({ "RefArr.name": "PI" }),

      VishuDB.countDocuments({ "apiResponse.PIResponse.status.message": "Lead created successfully" }), // <<-- Zype से VishuDB में बदला गया
      VishuDB.countDocuments(),
      VishuDB.countDocuments({ "RefArr.name": "PI" }),
      Delhi.countDocuments({ "apiResponse.CreditFy.leadCreate.message": "SUCCESS" }),
      Delhi.countDocuments(),
      Delhi.countDocuments({ "RefArr.name": "CreditFy" })
    ]);


    return res.status(200).json({
      success: true,
      message: "All lenders data fetched successfully",
      lender: {
        SmartCoin: { Success: scSuccess, Processed: scProcessed, Total: scTotal, users: scUsers },
        SmartCoin2: { Success: scSuccess2, Processed: scProcessed2, Total: scTotal2, users: scUsers2 },

        DCL: { Success: dclSuccess, Processed: dclProcessed, Total: dclTotal, users: dclUsers },
        PL: { Success: plSuccess, Processed: plProcessed, Total: plTotal, users: plUsers },

        Mpokket: { Success: mpSuccess, Processed: mpProcessed, Total: mpTotal, users: mpUsers },
        Mpokket2: { Success: mpSuccess2, Processed: mpProcessed2, Total: mpTotal2, users: mpUsers2 },

        Zype: { Success: zSuccess, Processed: zProcessed, Total: zTotal, users: zUsers },
        Zype2: { Success: zSuccess2, Processed: zProcessed2, Total: zTotal2, users: zUsers2 },

        RamFinance: { Success: rfSuccess, Processed: rfProcessed, Total: rfTotal, users: rfUsers },

        MoneyView2: { Success: mv2Success, Processed: mv2Processed, Total: mv2Total, users: mv2Users },

        LoanTaps: { Success: ltSuccess, Processed: ltProcessed, Total: ltTotal, users: ltUsers },

        creditsea: { Success: csSuccess, Processed: csProcessed, Total: csTotal, users: csUsers },

        CapitalNow: { Success: cnSuccess, Processed: cnProcessed, Total: cnTotal, users: cnUsers },

        Branch: { Success: brSuccess, Processed: brProcessed, Total: brTotal, users: brUsers },

        chintamani: { Success: chSuccess, Processed: chProcessed, Total: chTotal, users: chUsers },

        PayMe: { Success: paymeSuccess, Processed: paymeProcessed, Total: paymeTotal, users: paymeUsers },

        PayMe2: { Success: payme2Success, Processed: payme2Processed, Total: payme2Total, users: payme2Users },

        // Changed 'FiMoney' to 'PI' (or kept 'FiMoney' if that's the desired output name, but used PI variables)
        // Corrected the missing comma that caused the syntax error.
        FiMoney: { Success: piSuccess, Processed: piProcessed, Total: piTotal, users: piUsers }, // <-- Added comma
        FiMoney2: { Success: pi2Success, Processed: pi2Processed, Total: pi2Total, users: piUsers2 },
        CreditFy: { Success: cfSuccess, Processed: cfProcessed, Total: cfTotal, users: cfUsers },
      }
    });

  } catch (error) {
    console.error("Error in campianData:", error); // Changed function name for accuracy
    return res.status(500).json({
      success: false,
      message: "Server Error in fetching campaign data",
      error: error.message,
    });
  }
};



// exports.situ = async (req, res) =>{
//     try {
//        const User = await VishuDB.countDocuments();
//        return res.status(200).json({
//            success: true,
//            message: "All lenders data fetched successfully",
//            Total: User
// 	});
//     }catch(error){
//         return res.status(500).json({
//             success: false,
//             message: "Server Error",
//             error: error.message,
//         });
//     }		
// }
