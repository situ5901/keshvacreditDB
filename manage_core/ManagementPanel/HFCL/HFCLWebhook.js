const BlackCover = require("../MultiDataBase/BlackCover.js");
const HFCLSCH = require("../MultiDataBase/MultiSchema/HFCL.js")(BlackCover);
const headerToken = "herofincop-64situ5901keshva";

//DEBUG: Fix HCFL code:-
exports.webhookhfcl = async (req, res) => {
  try {
    const AuthTokne = req.headers["authtokne"];

    if (!AuthTokne || AuthTokne !== headerToken) {
      return res.status(401).send("Unauthorized: Invalid Token");
    }

    const { partnerReferenceId, Loanstatus } = req.body;

    if (!partnerReferenceId || !Loanstatus) {
      return res.status(400).json({
        error: "Bad Request",
        message: "partnerReferenceId or Loanstatus is missing",
      });
    }

    const existingLead = await HFCLSCH.findOne({ partnerReferenceId });
    if (existingLead) {
      return res.status(409).json({
        error: "Conflict",
        message: `Duplicate Error: partnerReferenceId ${partnerReferenceId} already exists!`,
      });
    }

    const newEntry = new HFCLSCH({
      partnerReferenceId,
      Loanstatus,
    });

    await newEntry.save();

    return res.status(200).json({
      message: "Keshvacredit has successfully received and saved the request!",
      status: Loanstatus,
      partnerReferenceId: partnerReferenceId,
    });
  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
