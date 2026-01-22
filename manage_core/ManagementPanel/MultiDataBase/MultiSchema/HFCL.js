const { Schema } = require("mongoose");

module.exports = (connection) => {
  const leaderSchema = new Schema(
    {
      appId: { type: Number, required: true, unique: true },
      currentStage: { type: String },
      previousStage: { type: String },
      nextStage: { type: String },
      roi: { type: String },
      sanctionLoanAmount: { type: String },
      rejectReason: { type: String },
      partnerReferenceId: { type: String },
      status: { type: String },
      utmSource: { type: String },
      utmCampaign: { type: String },
      utmMedium: { type: String },
      utmContent: { type: String },
      utmCampaignId: { type: String },
      createdDate: { type: Date },
      receivedAt: { type: String, default: () => new Date().toLocaleString() },
    },
    { versionKey: false, strict: false },
  );

  // Dono models ko alag alag define karke ek object mein bhejna hoga
  const HCFL1 = connection.model("HCFL1", leaderSchema, "hfclCase");
  const HCFL2 = connection.model("HCFL2", leaderSchema, "hfclStatus");

  return { HCFL1, HCFL2 };
};
