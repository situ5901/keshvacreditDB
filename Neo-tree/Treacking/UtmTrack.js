const UTMBaseURL = "https://keshvacredit.com/apply";

const generateUTMLink = (partner, campaign) => {
    const url = new URL(UTMBaseURL);
    url.searchParams.append("utm_source", partner);
    url.searchParams.append("utm_medium", "referral");
    url.searchParams.append("utm_campaign", campaign);
    
    return url.toString();
};

exports.generateUTM = function(req, res) {
    // POST request ke liye req.body use karein
    const p = req.body.partner;
    const c = req.body.campaign;
    const r = req.body.referral;
    if (!p || !c || !r) {
        return res.status(400).send("Partner and campaign are required in body");
    }

    const link = generateUTMLink(p, c);
    res.send(`This is Your UTM Link: ${link}`);
};

