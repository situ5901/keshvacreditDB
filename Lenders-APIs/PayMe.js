const express = require("express");
const router = express.Router();
const axios = require("axios");


const CHECK_USER_API = "https://weedori.paymeindia.in/api/authentication/check_user_merchant/";
const REGISTER_USER_API = "https://weedori.paymeindia.in/api/authentication/register_user_merchant/";
const MERCHANT_ID = "98cdbb76-30c2-4bc8-9656-774350eabe8d";


router.post("/Patner", async (req, res) => {
    const { email, pan, phone, name } = req.body;
   
    const checkPayload = {
        email: email,
        merchant_id: MERCHANT_ID,
        pan_card_number: pan,
    };
    try {
        let finalResponse;
        
        const PayMeCheckResponse = await axios.post(CHECK_USER_API, checkPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const checkResult = PayMeCheckResponse.data;

        if (checkResult.success === false || checkResult.message !== "User found") {
            
            const registerPayload = {
                email: email,
                merchant_id: MERCHANT_ID,
                phone_number: phone,
                full_name: name,
            };

            const RegisterUserResponse = await axios.post(REGISTER_USER_API, registerPayload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            finalResponse = RegisterUserResponse.data;
        } else {
            finalResponse = checkResult;
        }
        
        res.json(finalResponse);

    } catch (err) {
        const errorDetails = err.response ? err.response.data : { message: err.message };
        
        res.status(err.response ? err.response.status : 500).json({
            success: false,
            error: "API integration failed",
            details: errorDetails
        });
    }
});

module.exports = router;
