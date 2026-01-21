const { Schema } = require("mongoose");

module.exports = (connection) => {
  const leaderSchema = new Schema(
    {
      partnerReferenceId: {
        type: String,
        required: true,
      },
      Loanstatus: {
        type: String,
        required: true,
      },
      receivedAt: {
        type: Date,
        default: Date.now, // Timestamp tracking ke liye
      },
    },
    {
      versionKey: false,
    },
  );

  return connection.model("hfclLeader", leaderSchema, "hfcl");
};
