const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {GoldLoan} = require("../CSC/CSCschema.js");

exports.applyGoldLoan = async (req, res) => {
    try {
        const { phone, email } = req.body;

        const existing = await GoldLoan.findOne({
            $or: [{ phone }, { email }]
        });

        if (existing) {
            return res.status(409).json({
                message: "Duplicate application detected",
                existing
            });
        }

        const loan = new GoldLoan(req.body);
        await loan.save();
        
        // Success response
        res.status(201).json({ message: "Gold loan application submitted", loan });

    } catch (err) {
        console.error("GoldLoan error:", err.message);
        // Handle Mongoose validation errors (if any) or general server errors
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: "Server error" });
    }
};
