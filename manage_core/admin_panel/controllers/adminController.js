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
const {
  MoneyView,
  MoneyView2,
  smcoll,
  dailyworks,
  LoanTaps,
} = require("../../models/CheckLenderSchema");

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
    const users2 = await Users.countDocuments();

    if (users === 0) {
      return res
        .status(404)
        .json({ message: "❌ No users found in User collection" });
    }

    totalUsers = users + users2;

    return res.status(200).json({
      message: "✅ User counts retrieved successfully",
      userCount: users,
      users2Count: users2,
      totalUsers,
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
    const count = await MoneyView.countDocuments({
      "apiResponse.moneyViewDedupe.message": "No dedupe found",
    });
    const count2 = await MoneyView.countDocuments();
    const count3 = await MoneyView.countDocuments({
      "apiResponse.moneyViewOffers.message": "success",
    });
    const count4 = await MoneyView.countDocuments({
      "RefArr.name": "MoneyView",
    });
    const count5 = await MoneyView.countDocuments({
      "apiResponse.moneyViewLeadSubmission.message": "success",
    });
    const smartcoin = await smcoll.countDocuments({
      "apiResponse.message": "Lead created successfully",
    });
    const smartcoin2 = await smcoll.countDocuments();
    const smartcoin3 = await smcoll.countDocuments({
      "apiResponse.message": "duplicate found and partner can reject this lead",
    });
    const smartcoin4 = await smcoll.countDocuments({
      "RefArr.name": "Smartcoin",
    });
    const DCL = await smcoll.countDocuments({
      "apiResponse.data.product_type": "CARD",
    });
    const DCL2 = await smcoll.countDocuments();
    const DCL3 = await smcoll.countDocuments({
      "RefArr.name": "FatakPayDCL",
    });
    const PL = await smcoll.countDocuments({
      "apiResponse.data.product_type": "EMI",
    });
    const PL2 = await smcoll.countDocuments();
    const PL3 = await smcoll.countDocuments({ "RefArr.name": "FatakPay" });
    const Mpokket = await smcoll.countDocuments({
      "apiResponse.MpokketResponse.preApproval.message":
        "Data Accepted Successfully",
    });
    const Mpokket2 = await smcoll.countDocuments({
      "apiResponse.MpokketResponse.message": "User Not Eligible for Loan",
    });
    const Mpokket3 = await smcoll.countDocuments();
    const Mpokket4 = await smcoll.countDocuments({
      "RefArr.name": "Mpokket",
    });
    const Zype = await smcoll.countDocuments({
      "apiResponse.ZypeResponse.status": "ACCEPT",
    });
    const Zype2 = await smcoll.countDocuments();
    const Zype3 = await smcoll.countDocuments({
      "apiResponse.ZypeResponse.status": "REJECT",
    });
    const Zype4 = await smcoll.countDocuments({
      "RefArr.name": "Zype",
    });
    const RamFinance = await smcoll.countDocuments({
      "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully",
    });
    const RamFinProcessed = await smcoll.countDocuments({
      "RefArr.name": "RamFin",
    });
    const RamFinCount = await smcoll.countDocuments();
    const nodedupe = await MoneyView2.countDocuments({
      "apiResponse.moneyViewDedupe.message": "No dedupe found",
    });
    const completeDB = await MoneyView2.countDocuments();
    const Offeres = await MoneyView2.countDocuments({
      "apiResponse.moneyViewOffers.message": "success",
    });
    const processMV = await MoneyView2.countDocuments({
      "RefArr.name": "MoneyView",
    });
    const Submission = await MoneyView2.countDocuments({
      "apiResponse.moneyViewLeadSubmission.message": "success",
    });
    const LT = await LoanTaps.countDocuments({
      "apiResponse.LoanTap.message": "Application created successfully.",
    });
    const LT2 = await LoanTaps.countDocuments({});
    return res.status(200).json({
      success: true,
      message: "✅ Counts retrieved successfully",
      lender: {
        MoneyView: {
          Moneyview: count,
          MoneyViewOffers: count3,
          MoneyViewProcessed: count4,
          MoneyViewTotal: count2,
          MoneyViewSubmited: count5,
        },
        MoneyView2: {
          Moneyview2: nodedupe,
          MoneyViewOffers: Offeres,
          MoneyViewProcessed: processMV,
          MoneyViewSubmited: Submission,
          MoneyViewTotal: completeDB,
        },
        SmartCoin: {
          smartcoin: smartcoin,
          smartcoinRejected: smartcoin3,
          smartcoinProcessed: smartcoin4,
          smartcoinTotal: smartcoin2,
        },
        DCL: {
          DCL: DCL,
          DCLProcessed: DCL3,
          DCLTotal: DCL2,
        },
        PL: {
          PL: PL,
          PLProcessed: PL3,
          PLTotal: PL2,
        },
        Mpokket: {
          Mpokket: Mpokket,
          MpokketRejected: Mpokket2,
          MpokketProcessed: Mpokket4,
          MpokketTotal: Mpokket3,
        },
        Zype: {
          Zype: Zype,
          ZypeRejected: Zype3,
          ZypeProcessed: Zype4,
          ZypeTotal: Zype2,
        },
        RamFinance: {
          RamFinance: RamFinance,
          RamFinProcessed: RamFinProcessed,
          RamFinTotal: RamFinCount,
        },
        LoanTaps: {
          LoanTaps: LT,
          LoanTapsTotal: LT2,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getLendersData:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Server Error",
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
