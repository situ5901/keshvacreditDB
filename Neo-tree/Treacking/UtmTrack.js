const axios = require("axios");
const jwt = require("jsonwebtoken");
const URL = require("url").URL;
const UTMBaseURL = "https://keshvacredit.com/apply";
const ConsentSchema = require("../../models/CampConsentSchema")



const otpStorage = new Map();

const generateUTMLink = (partner, campaign) => {
    const url = new URL(UTMBaseURL);
    url.searchParams.append("utm_source", partner);
    url.searchParams.append("utm_medium", "referral");
    url.searchParams.append("utm_campaign", campaign);
    
    return url.toString();
};

exports.generateUTM = function(req, res) {
    const p = req.body.partner;
    const c = req.body.campaign;
    const r = req.body.referral;
    if (!p || !c || !r) {
        return res.status(400).send("Partner and campaign are required in body");
    }

    const link = generateUTMLink(p, c);
    res.send(`This is Your UTM Link: ${link}`);
};



exports.SendOtpCamp = async function(req, res) {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ status: false, message: "Phone number required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStorage.set(phone, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });

        const message = `Dear customer, ${otp} is your login OTP. Valid for 10 minutes. Please do not share with anyone. Regards KeshvaCredit.`;
        const smsUrl = `https://web.smscloud.in/api/pushsms?user=KESHVACREDIT&authkey=${process.env.SMSCLOUD_API_KEY}&sender=KVcred&mobile=${phone}&text=${encodeURIComponent(message)}&templateid=1707174409184160229&rpt=1`;
        
        // Axios call ke liye function 'async' hona chahiye (fixed)
        await axios.get(smsUrl);

        console.log("✅ OTP Sent to", phone, "=>", otp);
        res.status(200).json({ status: "Success", message: "OTP sent successfully" });

    } catch (error) {
        console.error("❌ SMS Error:", error.response?.data || error.message);
        res.status(500).json({ status: false, message: "Error sending OTP" });
    }
};

exports.VerifyOtpCamp = async function(req, res) {
    try {
        const { phone, otp } = req.body;
        const otpData = otpStorage.get(phone);

        if (!otpData || otpData.otp !== parseInt(otp) || Date.now() > otpData.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        await ConsentSchema.findOneAndUpdate(
            { phone: phone }, 
            { verifiedAt: currentTime }, 
            { 
                new: true, 
                upsert: true, 
                setDefaultsOnInsert: true 
            }
        );

        console.log("✅ Data processed for:", phone);

        otpStorage.delete(phone);

        const token = jwt.sign({ phone }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.status(200).json({ status: "True", message: "OTP verified", token });

    } catch (error) {
        console.error("❌ Save Error:", error);
        res.status(500).json({ message: "Data save nahi ho paya", error: error.message });
    }
};
