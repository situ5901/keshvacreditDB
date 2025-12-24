const express = require("express");
const router = express.Router();
const { partnerdb, customer } = require("../PartnersAPIs/PartnerSchema");
const User = require("../models/user.model.js"); 
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const filterLenders = require("../utils/filterLenders");

const {
    AUTH_KEY_VITO,
    VALID_VITO_ID,
} = require("../config/partnerConf.js");

function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear(); 
    const month = String(now.getMonth() + 1).padStart(2, "0"); 
    const day = String(now.getDate()).padStart(2, "0"); 
    return `${year}-${month}-${day}`;
}
router.get("/testdeno", async (req, res) => {
    res.send("Hello World!");
});

router.post("/vito", async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        const authKey = authHeader?.replace(/^Bearer\s+/i, "");

        if (!authKey || authKey !== AUTH_KEY_VITO) {
            return res.status(401).json({ status: 401, error: "Unauthorized access or Invalid API Key" });
        }
        
        const {
            name, phone, email, employment, pan, pincode, state, city, gender, 
            income, dob, partner_Id, loanAmount
        } = req.body;

        const requiredFields = [
            "name", "phone", "email", "employment", "pan", "pincode", "state", 
            "city", "gender", "income", "dob", "partner_Id", "loanAmount"
        ];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                status: 400,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        
        if (partner_Id !== VALID_VITO_ID) {
            return res.status(403).json({
                status: 403,
                error: "Invalid partner_Id. Access denied.",
            });
        }
        
        if (!panRegex.test(pan)) {
             return res.status(400).json({
                status: 400,
                error: "Invalid PAN format.",
            });
        }

        const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
        let successMessage;

        if (existingUser) {
            userId = existingUser.phone;
            successMessage = "Existing user found, eligible lenders fetched successfully";
        } else {
            const newUser = new User({
                name, phone, email, employment, pan, pincode, state, city, gender, 
                income, dob, partner_Id, loanAmount
            }); 
            
            await newUser.save();
            userId = newUser.phone;
            successMessage = "New user registered and eligible lenders fetched successfully";
        }
        
        const dobDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dobDate.getDate())
        ) {
            age--;
        }

        const parsedPincode = pincode.toString().trim();
        
        const lenders = await filterLenders(
            age,
            income,
            loanAmount,
            employment,
            parsedPincode,
        );

        return res.status(200).json({
            status: 200,
            message: successMessage,
            data: {
                userId: userId,
                lenders: lenders
            },
        });

    } catch(err) {
        console.error("Server Error in /vito:", err);
        return res.status(500).json({ status: 500, error: "Internal Server Error" });
    }
});


module.exports = router;
