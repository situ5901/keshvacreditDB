const { partnerdb, customer } = require("../../PartnersAPIs/PartnerSchema");

exports.dashboard = (req, res) => {
  res.send("✅ Welcome to Leaders Dashboard");
};
exports.partnerData = async (req, res) => {
  try {
    const { partner_Id } = req.body;
    let partners;
    if (partner_Id) {
      partners = await partnerdb.find({ partner_Id });
      if (partners.length === 0) {
        return res.status(404).json({ message: "❌ Partner not found" });
      }
    } else {
      return res.status(404).json({ message: "❌ No partners found" });
    }

    return res.status(200).json({
      const: partners.length,
      message: "✅ Partner data fetched successfully",
      data: partners,
    });
  } catch (err) {
    res.status(500).json({ message: "❌ Server Error", error: err.message });
  }
};
