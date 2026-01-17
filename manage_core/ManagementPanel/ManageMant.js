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

// FIX: Yahan model ko sahi se extract karein
const BlackCoverModels =
  require("../ManagementPanel/MultiDataBase/MultiSchema/BlackCoverSch")(
    BlackCover,
  );
const fatakPayModel = BlackCoverModels.fatakPayCOll;

const {
  Mvcoll,
  Loantap,
  Delhi,
  MoneyView2,
  smcoll,
  PayMe,
  PayMe2,
  Ramfin,
} = require("../models/CheckLenderSchema");

exports.campianData = async (req, res) => {
  try {
    if (!RSUnity) throw new Error("RSUnity Model not found.");
    if (!fatakPayModel) throw new Error("FatakPay Model not found in schema.");

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
      csUsers,
      cnUsers,
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

      // BlackCover FatakPay DCL
      fatakPayModel.find(
        { "apiResponse.FatakPayDCL.data.product_type": "CARD" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),

      // BlackCover FatakPay PL
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

      // BlackCover Ramfin (Same Collection)
      fatakPayModel.find(
        { "apiResponse.Ramfin.leadCreate.message": "Attributed Successfully" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),

      MoneyView2.find(
        { "apiResponse.moneyViewLeadSubmission.message": "success" },
        { phone: 1, email: 1, pan: 1, name: 1, _id: 0 },
      ),
      Loantap.find(
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

      // FatakPay DCL Counts
      fatakPayModel.countDocuments({
        "apiResponse.FatakPayDCL.data.product_type": "CARD",
      }),
      fatakPayModel.countDocuments(),
      fatakPayModel.countDocuments({ "RefArr.name": "FatakPayDCL" }),

      // FatakPay PL Counts
      fatakPayModel.countDocuments({
        "apiResponse.FatakPayPL.data.product_type": "EMI",
      }),
      fatakPayModel.countDocuments(), // Total FatakPay
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

      // RamFin Counts (Same Collection)
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
      Loantap.countDocuments({
        "apiResponse.LoanTap.fullResponse.message":
          "Application created successfully",
      }),
      Loantap.countDocuments(),
      Loantap.countDocuments({ "RefArr.name": "LoanTap" }),
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
        "PayMe ⛔": {
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
