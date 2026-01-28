const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");
const Member = require("../../models/Member");
const User = require("../../../models/user.model.js");
const Users = require("../../../models/checkdata.js");
const AgentModel = require("../../models/AgentModel.js");
const CheckUser = require("../../models/checkuser");
const MemberData = require("../../../models/infiSchema");
const { CSCmodel } = require("../../CSC/CSCschema.js");
const { Token, Notification } = require("./notigySchema.js");
const serviceAccount = require("./serviceaccountkey.json");

const db1 = require("../../ManagementPanel/MultiDataBase/GuniConDB");
const CVDB = require("../../ManagementPanel/MultiDataBase/Cover_Vishu");
const ASHIJA_Vishu3 = require("../../ManagementPanel/MultiDataBase/ASIJAVISHAL3");
const MONGODB_CML = require("../../ManagementPanel/MultiDataBase/MONGODB_CML");
const MONGODB_RSUnity = require("../../ManagementPanel/MultiDataBase/RSUnity");
const BlackCover = require("../../ManagementPanel/MultiDataBase/BlackCover");

// ---------------- MODELS & SCHEMAS ----------------
const VishuDB =
  require("../../ManagementPanel/MultiDataBase/MultiSchema/MultipalDBSchema")(
    db1,
  );
const Dell =
  require("../../ManagementPanel/MultiDataBase/MultiSchema/Cover_VishuDB")(
    CVDB,
  );
const { MvcollCV, PaymeCV } =
  require("../../ManagementPanel/MultiDataBase/MultiSchema/ASIJAVISHAL3Sch")(
    ASHIJA_Vishu3,
  );

const CML_Models =
  require("../../ManagementPanel/MultiDataBase/MultiSchema/CMLSch")(
    MONGODB_CML,
  );
const PersonalPayMe = CML_Models.PersonalPayMe;

const RS_Models =
  require("../../ManagementPanel/MultiDataBase/MultiSchema/RSUnitySch")(
    MONGODB_RSUnity,
  );
const RSUnity = RS_Models.RSUnity;

const BlackCoverModels =
  require("../../ManagementPanel/MultiDataBase/MultiSchema/BlackCoverSch")(
    BlackCover,
  );
const fatakPayModel = BlackCoverModels.fatakPayCOll;

// --- FIX: Hum uniform name use karenge 'LoanTapModel' ---
const LoanTapModel = BlackCoverModels.LoanTapCOll;
const { partnerdb, customer } = require("../../../PartnersAPIs/PartnerSchema");
exports.login = (req, res) => {
  const { adminName, adminMail, password } = req.body;

  if (!adminName || !adminMail || !password) {
    return res
      .status(400)
      .json({ message: "❌ Admin name, email, and password are required" });
  }

  const adminDataPath = path.join(__dirname, "../data/admin.json");

  if (!fs.existsSync(adminDataPath)) {
    return res.status(500).json({ message: "❌ Admin data file not found" });
  }

  let adminData;
  try {
    const fileContent = fs.readFileSync(adminDataPath, "utf-8");
    adminData = JSON.parse(fileContent);
  } catch (err) {
    return res.status(500).json({ message: "❌ Failed to read admin data" });
  }

  if (
    adminName === adminData.adminName &&
    adminMail === adminData.adminMail &&
    password === adminData.password
  ) {
    const token = jwt.sign(
      { role: "admin", username: adminMail },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "24h" },
    );

    return res.json({
      role: "SuperAdmin",
      message: "✅ Admin logged in",
      token,
    });
  } else {
    return res.status(401).json({ message: "❌ Invalid admin credentials" });
  }
};

exports.Adminlogin = (req, res) => {
  const { adminName, adminMail, password } = req.body;

  if (!adminName || !adminMail || !password) {
    return res
      .status(400)
      .json({ message: "❌ Admin name, email, and password are required" });
  }

  const adminDataPath = path.join(__dirname, "../data/leaders.json");

  if (!fs.existsSync(adminDataPath)) {
    return res.status(500).json({ message: "❌ Admin data file not found" });
  }

  let adminData;
  try {
    const fileContent = fs.readFileSync(adminDataPath, "utf-8");
    adminData = JSON.parse(fileContent);
  } catch (err) {
    return res.status(500).json({ message: "❌ Failed to read admin data" });
  }

  if (
    adminName === adminData.adminName &&
    adminMail === adminData.adminMail &&
    password === adminData.password
  ) {
    const token = jwt.sign(
      { role: "admin", username: adminMail },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "24h" },
    );

    return res.json({
      role: "Leaders",
      message: "✅ Leaders logged in",
      token,
    });
  } else {
    return res.status(401).json({ message: "❌ Invalid admin credentials" });
  }
};

exports.dashboard = (req, res) => {
  res.send("✅ Welcome to Admin Dashboard");
};

exports.createMember = async (req, res) => {
  const { Membername, MemberMail, MemberPassword } = req.body;

  try {
    if (!Membername || !MemberMail || !MemberPassword) {
      return res.status(400).json({ message: "❌ Missing fields" });
    }

    const existing = await Member.findOne({ MemberMail });
    if (existing) {
      return res.status(400).json({ message: "❌ Member already exists" });
    }
    const hashedPassword = await bcrypt.hash(MemberPassword, 10);
    const member = new Member({
      Membername,
      MemberMail,
      MemberPassword: hashedPassword,
    });
    await member.save();
    const token = req.headers.authorization?.split(" ")[1];
    let createdBy = "unknown";

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      createdBy = decoded.username || "unknown";
    }

    console.log("📧 Sending alert >>", createdBy, MemberMail);
    res.json({
      role: "Member",
      message: "✅ Member added successfully",
      createdBy,
    });
  } catch (error) {
    console.error("❌ Error creating member:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.deleteMember = async (req, res) => {
  const { MemberMail, Membername } = req.body;

  if (!MemberMail || !Membername) {
    return res
      .status(400)
      .json({ message: "Enter valid userMail and username" });
  }

  try {
    const user = await Member.findOneAndDelete({ MemberMail, Membername });

    if (!user) {
      return res.status(404).json({ message: "❌ Member not found" });
    }

    return res.status(200).json({ message: "✅ Member deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting member:", error);
    return res.status(500).json({ message: "❌ Server error" });
  }
};

exports.createAgent = async (req, res) => {
  const { AgentMail, Agentname, AgentPassword } = req.body;

  if (!AgentMail || !Agentname || !AgentPassword) {
    return res.status(400).json({ message: "❌ Missing fields" });
  }

  try {
    const existing = await AgentModel.findOne({
      $or: [{ AgentMail }, { Agentname }],
    });

    if (existing) {
      return res.status(400).json({ message: "❌ Agent already exists" });
    }

    const hashedPassword = await bcrypt.hash(AgentPassword, 10);

    const newAgent = new AgentModel({
      AgentMail,
      Agentname,
      AgentPassword: hashedPassword,
    });

    await newAgent.save();

    res.status(201).json({ message: "✅ Agent created successfully" });
  } catch (error) {
    console.error("❌ Error creating agent:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.deleteAgents = async (req, res) => {
  const { AgentMail, Agentname } = req.body;
  try {
    const { AgentMail, Agentname } = req.body;
    const agents = await AgentModel.findOneAndDelete({ AgentMail, Agentname });
    if (!agents) return res.status(404).json({ message: "❌ Agent not found" });
    return res.status(200).json({ message: "✅ Agent deleted successfully" });
  } catch (error) {
    console.error("❌ Error getting agents:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const AppUsers = await User.countDocuments({ platform: "application" });
    if (users === 0) {
      return res
        .status(404)
        .json({ message: "❌ No users found in User collection" });
    }

    totalUsers = users - AppUsers;

    return res.status(200).json({
      message: "✅ User counts retrieved successfully",
      Total: users,
      webUser: totalUsers,
      AppUser: AppUsers,
    });
  } catch (error) {
    console.error("❌ Error getting users:", error);
    res.status(500).json({ message: "❌ Server error", error: error.message });
  }
};

exports.analysis = async (req, res) => {
  try {
    const validUsers = await Users.countDocuments({
      phone: { $exists: true, $ne: "" },
      employment: { $exists: true, $ne: "" },
      dob: { $exists: true, $ne: "" },
      email: { $exists: true, $ne: "" },
      gender: { $exists: true, $ne: "" },
      name: { $exists: true, $ne: "" },
      pan: { $exists: true, $ne: "" },
      city: { $exists: true, $ne: "" },
      income: { $exists: true, $ne: "" },
      pincode: { $exists: true, $ne: "" },
      state: { $exists: true, $ne: "" },
    });
    const totalUsers = await Users.countDocuments();
    const invalidUsers = totalUsers - validUsers;

    return res.status(200).json({
      message: "✅ User completeness count",
      validUsers,
      invalidUsers,
      totalUsers,
    });
  } catch (error) {
    console.error("❌ Error in analysis:", error);
    return res.status(500).json({
      message: "❌ Server Error",
      error: error.message,
    });
  }
};

exports.getLendersData = async (req, res) => {
  try {
    const [
      // SmartCoin
      scSuccess,
      scTotal,
      scProcessed,

      scSuccess2,
      scTotal2,
      scProcessed2,

      // FatakPay
      dclSuccess,
      dclTotal,
      dclProcessed,

      plSuccess,
      plTotal,
      plProcessed,

      // Mpokket
      mpSuccess,
      mpTotal,
      mpProcessed,

      mpSuccess2,
      mpTotal2,
      mpProcessed2,

      // Zype
      zSuccess,
      zTotal,
      zProcessed,

      zSuccess2,
      zTotal2,
      zProcessed2,

      // RamFin
      rfSuccess,
      rfTotal,
      rfProcessed,

      // LoanTap
      ltSuccess,
      ltTotal,
      ltProcessed,

      // CreditSea
      csSuccess,
      csTotal,
      csProcessed,

      // PayMe
      paymeSuccess,
      paymeTotal,
      paymeProcessed,

      // FiMoney / PI
      piSuccess,
      piTotal,
      piProcessed,

      // CreditFy
      cfSuccess,
      cfTotal,
      cfProcessed,

      // BrightLoan
      blSuccess,
      blTotal,
      blProcessed,
    ] = await Promise.all([
      // -------- SmartCoin --------
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

      // -------- FatakPay DCL --------
      fatakPayModel.countDocuments({
        "apiResponse.FatakPayDCL.data.product_type": "CARD",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "FatakPayDCL" }),

      // -------- FatakPay PL --------
      fatakPayModel.countDocuments({
        "apiResponse.FatakPayPL.data.product_type": "EMI",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "FatakPay" }),

      // -------- Mpokket --------
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

      // -------- Zype --------
      Dell.countDocuments({ "apiResponse.ZypeResponse.status": "ACCEPT" }),
      Dell.countDocuments(),
      Dell.countDocuments({ "RefArr.name": "Zype" }),

      VishuDB.countDocuments({
        "RefArr.name": "Zype",
        "apiResponse.ZypeResponse.status": "ACCEPT",
      }),
      VishuDB.countDocuments({ "RefArr.name": "Zype" }),
      VishuDB.countDocuments({ "RefArr.name": "Zype" }),

      // -------- RamFin --------
      fatakPayModel.countDocuments({
        "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "RamFin" }),

      // -------- LoanTap --------
      LoanTapModel.countDocuments({
        "apiResponse.LoanTap.fullResponse.message":
          "Application created successfully",
      }),
      LoanTapModel.countDocuments(),
      LoanTapModel.countDocuments({ "RefArr.name": "LoanTap" }),

      // -------- CreditSea --------
      RSUnity.countDocuments({
        "RefArr.name": "creditsea",
        "apiResponse.CreditSea.message": "Lead generated successfully",
      }),
      RSUnity.countDocuments(),
      RSUnity.countDocuments({ "RefArr.name": "creditsea" }),

      // -------- PayMe --------
      PaymeCV.countDocuments({
        "apiResponse.payme.register_user.message": "Signed-in Successfully",
      }),
      PaymeCV.countDocuments(),
      PaymeCV.countDocuments({ "RefArr.name": "payme" }),

      // -------- FiMoney / PI --------
      LoanTapModel.countDocuments({
        "apiResponse.PIResponse.status.message": "Lead created successfully",
      }),
      LoanTapModel.countDocuments(),
      LoanTapModel.countDocuments({ "RefArr.name": "PI" }),

      // -------- CreditFy --------
      MvcollCV.countDocuments({
        "apiResponse.CreditFy.leadCreate.message": "SUCCESS",
      }),
      MvcollCV.countDocuments(),
      MvcollCV.countDocuments({ "RefArr.name": "CreditFy" }),

      // -------- BrightLoan --------
      RSUnity.countDocuments({
        "RefArr.name": "BrightLoan",
        "apiResponse.BrightLoan.Status": 1,
      }),
      RSUnity.countDocuments(),
      RSUnity.countDocuments({ "RefArr.name": "BrightLoan" }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Counts retrieved successfully",
      lender: {
        SmartCoin: {
          Success: scSuccess,
          Total: scTotal,
          Processed: scProcessed,
        },
        SmartCoin2: {
          Success: scSuccess2,
          Total: scTotal2,
          Processed: scProcessed2,
        },
        DCL: { Success: dclSuccess, Total: dclTotal, Processed: dclProcessed },
        DPL: { Success: plSuccess, Total: plTotal, Processed: plProcessed },
        Mpokket: { Success: mpSuccess, Total: mpTotal, Processed: mpProcessed },
        Mpokket2: {
          Success: mpSuccess2,
          Total: mpTotal2,
          Processed: mpProcessed2,
        },
        Zype: { Success: zSuccess, Total: zTotal, Processed: zProcessed },
        Zype2: {
          Success: zSuccess2,
          Total: zTotal2,
          Processed: zProcessed2,
        },
        RamFinance: {
          Success: rfSuccess,
          Total: rfTotal,
          Processed: rfProcessed,
        },
        LoanTap: { Success: ltSuccess, Total: ltTotal, Processed: ltProcessed },
        CreditSea: {
          Success: csSuccess,
          Total: csTotal,
          Processed: csProcessed,
        },
        PayMe: {
          Success: paymeSuccess,
          Total: paymeTotal,
          Processed: paymeProcessed,
        },
        FiMoney: {
          Success: piSuccess,
          Total: piTotal,
          Processed: piProcessed,
        },
        CreditFy: {
          Success: cfSuccess,
          Total: cfTotal,
          Processed: cfProcessed,
        },
        BrightLoan: {
          Success: blSuccess,
          Total: blTotal,
          Processed: blProcessed,
        },
      },
    });
  } catch (error) {
    console.error("Error in getLendersData:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getPartnerData = async (req, res) => {
  try {
    const { partner_Id } = req.body;

    if (!partner_Id) {
      return res.status(400).json({
        success: false,
        message: "❌ partner_Id is required",
      });
    }

    const count = await partnerdb.countDocuments({
      partner_Id: partner_Id.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "✅ Counts retrieved successfully",
      partner_Id,
      count,
    });
  } catch (error) {
    console.error("❌ Error in getPartnerData:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Server Error",
      error: error.message,
    });
  }
};

exports.getMembersData = async (req, res) => {
  try {
    const { partner_Id } = req.body;

    if (!partner_Id) {
      return res.status(400).json({
        success: false,
        message: "❌ partner_Id is required in request body",
      });
    }

    const count = await MemberData.countDocuments({
      $expr: {
        $eq: [
          {
            $toLower: {
              $trim: {
                input: {
                  $replaceAll: {
                    input: "$partner_id",
                    find: ",",
                    replacement: "",
                  },
                },
              },
            },
          },
          partner_Id.trim().replace(/,/g, "").toLowerCase(),
        ],
      },
    });

    return res.status(200).json({
      success: true,
      message: `✅ Count retrieved for partner_id`,
      count,
    });
  } catch (error) {
    console.error("❌ Error in getMembersData:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Server Error",
      error: error.message,
    });
  }
};

//...............CSC..Panels.........................................................................

exports.cscAgents = async (req, res) => {
  const { cscName, cscMail, cscPassword } = req.body;

  if (!cscName || !cscMail || !cscPassword) {
    return res.status(400).json({
      message: "❌ CSC name, email, and password are required",
    });
  }

  try {
    const existing = await CSCmodel.findOne({
      $or: [{ cscName: cscName }, { cscMail: cscMail }],
    });

    if (existing) {
      return res.status(400).json({ message: "❌ CSC User already exists" });
    }

    const hashedPassword = await bcrypt.hash(cscPassword, 10);

    const newCSCCenter = new CSCmodel({
      cscName,
      cscMail,
      cscPassword: hashedPassword,
    });

    await newCSCCenter.save();

    res
      .status(201)
      .json({ message: "✅ CSC User created successfully", newCSCCenter });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred during user registration" });
  }
};

exports.getCSCAgents = async (req, res) => {
  try {
    const CSCAgents = await CSCmodel.find();
    const CSCAgentsCount = await CSCmodel.countDocuments();
    return res.status(200).json({
      message: "✅ CSC Agents retrieved successfully",
      CSCAgentsCount,
      CSCAgents,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.deletecsc = async (req, res) => {
  const { cscName, cscMail } = req.body;
  try {
    const { cscName, cscMail } = req.body;
    const CSCagents = await CSCmodel.findOneAndDelete({ cscName, cscMail });
    if (!CSCagents)
      return res.status(404).json({ message: "❌ Agent not found" });
    return res.status(200).json({ message: "✅ Agent deleted successfully" });
  } catch (error) {
    console.error("❌ Error getting agents:", error);
    res.status(500).json({ message: "❌ Server error" });
  }
};

exports.notification = async (req, res) => {
  res.send("✅ Welcome to Notification Panel");
};

exports.saveToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "❌ Token is required." });
  }
  try {
    const existingToken = await Token.findOne({ token });
    if (!existingToken) {
      await Token.create({ token });
      return res.status(201).json({ message: "✅ Token saved successfully." });
    }
    return res.status(200).json({ message: "ℹ️ Token already exists." });
  } catch (error) {
    console.error("❌ Error saving token:", error);
    return res
      .status(500)
      .json({ message: "❌ Server error occurred while saving the token." });
  }
};

exports.SendToken = async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required." });
  }
  try {
    await Notification.create({ title, message });
    const token = await Token.find();
    const fcmToken = tokens.map((t) => t.token);
    if (fcmToken.length === 0) {
      return res.status(404).json({ message: " No tokens found." });
    }
    const messageData = {
      notification: { title, message },
      token: fcmToken,
    };
    const response = await admin.messaging().sendEachForMulticast(messageData);
    res.status(200).json({ message: "✅ Notification sent successfully." });
  } catch (error) {
    console.error(" Error sending notification:", error);
    return res.status(500).json({
      message: " Server error occurred while sending the notification.",
    });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res
      .status(500)
      .json({ message: "Server error occurred while getting notifications." });
  }
};
