const express = require("express");
const router = express.Router();

router.get("/", (req, res, next) => {
    const { utm_source, utm_medium, utm_campaign } = req.query;

    if (utm_source) {
        req.session.leadDetails = {
            source: utm_source,
            medium: utm_medium || "direct",
            campaign: utm_campaign || "not_set",
            entryTime: new Date().toLocaleString(),
        };

        // 2. Session ko manually save karein aur fir response dein
        return req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return next();
            }

            console.log(`[CCTV LOG]: Data Saved in Session for ${utm_source}`);

            // 3. Response mein wahi dikhayein jo save hua hai
            return res.json({
                status: "Success",
                message: "Data is now inside keshva_session",
                storedInSession: req.session.leadDetails
            });
        });
    }

    next();
});

router.get("/get-all", async (req, res) => {
  try {
    const ramfinLeads = await db
      .collection("userdb")
      .find(
        {
          "apiResponse.RamFin.status": "1",
          "apiResponse.RamFin.message": "Success",
        },
        {
          projection: { phone: 1, _id: 0 },
        },
      )
      .toArray();

    const zypeLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.fullResponse.status": "ACCEPT" },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const fatakPayLeads = await db
      .collection("userdb")
      .find(
        { "apiResponse.message": "You are eligible." },
        { projection: { phone: 1, _id: 0 } },
      )
      .toArray();

    const ramfinPhones = ramfinLeads.map((lead) => lead.phone);
    const zypePhones = zypeLeads.map((lead) => lead.phone);
    const fatakPayPhones = fatakPayLeads.map((lead) => lead.phone);

    res.status(200).json({
      success: true,
      message: "RamFin Create Leads",
      RamFin: {
        data: ramfinPhones,
        total: ramfinPhones.length,
      },
      Zype: {
        data: zypePhones,
        total: zypePhones.length,
      },
      FatakPayPL: {
        data: fatakPayPhones,
        total: fatakPayPhones.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching leads",
      error: error.message,
    });
  }
});

router.get("/Test", async (req, res) => {
  res.send("Hello CRM");
});

module.exports = router;
