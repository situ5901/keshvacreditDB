const crypto = require("crypto");
const BlackCover = require("../MultiDataBase/BlackCover.js");
const { HCFL1, HCFL2 } = require("../MultiDataBase/MultiSchema/HFCL.js")(
  BlackCover,
);

const AUTH_TOKEN = "herofincop-64%situ$5901keshvaNeoVim";
const SHARED_SECRET = "your_shared_secret_key_here";

exports.webhookOne = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || authHeader !== AUTH_TOKEN) {
      return res.status(401).json({
        status: "error",
        message: "Invalid API token",
        partnerReferenceId: req.body.partnerReferenceId || "N/A",
      });
    }

    const { partnerReferenceId, status } = req.body;

    if (!partnerReferenceId || !status) {
      return res.status(400).json({
        status: "error",
        message: "partnerReferenceId and status are mandatory",
        partnerReferenceId: partnerReferenceId || "N/A",
      });
    }

    const existingRecord = await HCFL2.findOne({ appId: partnerReferenceId });

    if (existingRecord) {
      return res.status(200).json({
        status: "success",
        message: "Partner already exists",
        partnerReferenceId: partnerReferenceId,
      });
    }

    await HCFL2.create({
      appId: partnerReferenceId,
      hiplStatus: status,
      lastUpdated: new Date().toLocaleString(),
    });

    return res.status(200).json({
      status: "success",
      message: "status received",
      partnerReferenceId: partnerReferenceId,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
      partnerReferenceId: req.body.partnerReferenceId || "N/A",
    });
  }
};

exports.webhookhfcl = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return res.status(401).json({
        status: "error",
        message: "Invalid API token",
        timestamp: new Date().toISOString(),
      });
    }

    const receivedSignature = req.headers["x-hipl-signature"];

    const dataToVerify = req.rawBody || JSON.stringify(req.body);

    const computedSignature = crypto
      .createHmac("sha256", SHARED_SECRET)
      .update(dataToVerify)
      .digest("hex");

    if (
      !receivedSignature ||
      receivedSignature.toLowerCase() !== computedSignature.toLowerCase()
    ) {
      console.error("Security Alert: Invalid HMAC Signature");
      return res.status(401).json({
        status: "error",
        message: "Invalid signature",
        timestamp: new Date().toISOString(),
        traceId:
          req.headers["x-request-id"] || crypto.randomBytes(16).toString("hex"),
      });
    }

    const {
      appId,
      currentStage,
      previousStage,
      nextStage,
      roi,
      sanctionLoanAmount,
      rejectReason,
      createdDate,
      utmSource,
      utmCampaign,
      utmMedium,
      utmContent,
      utmCampaignId,
    } = req.body;

    if (!appId) {
      return res.status(400).json({
        status: "error",
        message: "Missing mandatory field: appId",
      });
    }

    const updateData = {
      Loanstatus: currentStage,
      previousStage,
      nextStage,
      roi,
      sanctionLoanAmount,
      rejectReason,
      externalCreatedDate: createdDate,
      utmDetails: {
        source: utmSource,
        campaign: utmCampaign,
        medium: utmMedium,
        content: utmContent,
        campaignId: utmCampaignId,
      },
      lastUpdated: new Date(),
    };

    await HCFL1.findOneAndUpdate(
      { appId: appId },
      { $set: updateData },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      status: "success",
      message: "Event received",
      timestamp: new Date().toLocaleString(),
      traceId:
        req.headers["x-request-id"] || crypto.randomBytes(16).toString("hex"),
    });
  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Unhandled exception at backend",
      timestamp: new Date().toLocaleString(),
    });
  }
};

exports.WebhookGet = async (req, res) => {
  try {
    const data = await HCFL1.find({});
    return res.status(200).json({
      status: true,
      totalRecords: data.length,
      data: data,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
