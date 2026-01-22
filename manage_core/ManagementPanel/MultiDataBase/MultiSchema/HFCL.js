const { Schema } = require("mongoose");

module.exports = (connection) => {
  const leaderSchema = new Schema(
    {
      appId: { type: Number, required: true, unique: true },

      currentStage: { type: String, required: true }, // Doc: currentStage
      previousStage: { type: String }, // Doc: previousStage
      nextStage: { type: String }, // Doc: nextStage

      roi: { type: String }, // Doc: roi
      sanctionLoanAmount: { type: String }, // Doc: sanctionLoanAmount
      rejectReason: { type: String }, // Doc: rejectReason

      utmSource: { type: String }, // Doc: utmSource
      utmCampaign: { type: String }, // Doc: utmCampaign
      utmMedium: { type: String }, // Doc: utmMedium
      utmContent: { type: String }, // Doc: utmContent
      utmCampaignId: { type: String }, // Doc: utmCampaignId

      createdDate: { type: Date }, // Doc: createdDate
      receivedAt: { type: Date, default: Date.now }, // Internal timestamp
    },
    { versionKey: false },
  );

  return connection.model("hfclLeader", leaderSchema, "hfcl");
};
