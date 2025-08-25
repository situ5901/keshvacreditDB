const express = require("express");
const router = express.Router();
const { partnerdb, customer } = require("../PartnersAPIs/PartnerSchema");

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const {
  AUTH_KEY,
  VALID_PARTNER_ID,
  AUTH_KEY_ZYPE,
  VALID_ZYPE_ID,
  AUTH_CASHKUBER_kEY,
  VALID_CASHKUBER_ID,
  AUTH_KEY_RUPEE_READY,
  VALID_RUPEE_READY_ID,
} = require("../config/partnerConf.js");

function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear(); // YYYY
  const month = String(now.getMonth() + 1).padStart(2, "0"); // MM
  const day = String(now.getDate()).padStart(2, "0"); // DD
  return `${year}-${month}-${day}`;
}
router.get("/testdeno", async (req, res) => {
  res.send("Hello World!");
});

router.post("/cashkuber/create", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const authKey = authHeader?.replace(/^Bearer\s+/i, "");

    if (!authKey || authKey !== AUTH_CASHKUBER_kEY) {
      return res.status(401).json({ status: 401, error: "Unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      city,
      gender,
      income,
      creditScore,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      dob,
      partner_Id,
    } = req.body;

    // Required fields validation
    const requiredFields = {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      gender,
      city,
      income,
      dob,
      partner_Id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Partner ID validation
    if (partner_Id !== VALID_CASHKUBER_ID) {
      return res.status(403).json({
        status: 403,
        error: "Invalid partner_Id. Access denied.",
      });
    }

    // PAN format validation
    if (!panRegex.test(pan)) {
      return res.status(400).json({
        status: 400,
        error: "Invalid PAN format",
      });
    }

    // Check in both DBs for phone OR PAN
    const [userInCustomer, userInPartner] = await Promise.all([
      customer.findOne({ $or: [{ phone }, { pan }] }),
      partnerdb.findOne({ $or: [{ phone }, { pan }] }),
    ]);

    if (userInCustomer || userInPartner) {
      return res.status(409).json({
        status: 409,
        error: "User with this phone or PAN is already associated with us",
      });
    }

    // Create new user in partnerdb
    const newUser = new partnerdb({
      name,
      phone,
      email,
      employment: employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      gender,
      dob,
      creditScore,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      createdAt: getFormattedDate(),
      partner_Id,
    });

    await newUser.save();

    return res.status(201).json({
      status: 201,
      message: "✅ User created successfully",
      user: newUser,
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});

router.post("/create_apis", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const authKey = authHeader?.replace(/^Bearer\s+/i, "");
    if (!authKey || authKey !== AUTH_KEY) {
      return res.status(401).json({ status: 401, error: "Unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      gender,
      creditScore,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      city,
      income,
      dob,
      partner_Id,
    } = req.body;

    const requiredFields = {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      gender,
      city,
      income,
      dob,
      partner_Id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (partner_Id !== VALID_PARTNER_ID) {
      return res
        .status(403)
        .json({ status: 403, error: "Invalid partner_Id. Access denied." });
    }

    if (!panRegex.test(pan)) {
      return res.status(400).json({ status: 400, error: "Invalid PAN format" });
    }

    const [userInCustomer, userInPartner] = await Promise.all([
      customer.findOne({ phone, pan }),
      partnerdb.findOne({ phone, pan }),
    ]);

    if (userInCustomer || userInPartner) {
      return res
        .status(409)
        .json({ status: 409, error: "User is already associated with us" });
    }
    const newUser = new partnerdb({
      name,
      phone,
      email,
      employment: employeeType,
      pan,
      state,
      city,
      pincode,
      gender,
      creditScore,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      income,
      dob,
      partner_Id,
      createdAt: getFormattedDate(),
    });

    await newUser.save();

    return res
      .status(201)
      .json({ status: 201, message: "User created", user: newUser });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 409,
        error: "Duplicate data found. User already exists.",
      });
    }
    console.error("❌ Server Error:", err);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});

router.post("/zype/create", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const authKey = authHeader?.replace(/^Bearer\s+/i, "");

    if (!authKey || authKey !== AUTH_KEY_ZYPE) {
      return res.status(401).json({ status: 401, error: "Unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      dob,
      gender,
      creditScore,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      partner_Id,
    } = req.body;

    const requiredFields = {
      name,
      phone,
      email,
      employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      gender,
      dob,
      partner_Id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (partner_Id !== VALID_ZYPE_ID) {
      return res.status(403).json({
        status: 403,
        error: "Invalid partner_Id. Access denied.",
      });
    }

    if (!panRegex.test(pan)) {
      return res.status(400).json({
        status: 400,
        error: "Invalid PAN format",
      });
    }

    const [userInCustomer, userInPartner] = await Promise.all([
      customer.findOne({ phone, pan }),
      partnerdb.findOne({ phone, pan }),
    ]);

    if (userInCustomer || userInPartner) {
      return res.status(409).json({
        status: 409,
        error: "User is already associated with us",
      });
    }

    const newUser = new partnerdb({
      name,
      phone,
      email,
      employment: employeeType,
      pan,
      state,
      city,
      pincode,
      creditScore,
      gender,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      income,
      dob,
      createdAt: getFormattedDate(),
      partner_Id,
    });

    await newUser.save();

    return res.status(201).json({
      status: 201,
      message: "Zype partner user created successfully!",
      user: newUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: 409,
        error: "Duplicate data found. User already exists.",
      });
    }

    console.error("Server Error:", err);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});
// situ update
router.post("/rupeereaddy/create", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const authKey = authHeader?.replace(/^Bearer\s+/i, "");

    if (!authKey || authKey !== AUTH_KEY_RUPEE_READY) {
      return res.status(401).json({ status: 401, error: "Unauthorized" });
    }

    const {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      city,
      income,
      creditScore,
      SalaryType,
      gender,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      dob,
      partner_Id,
    } = req.body;

    const requiredFields = {
      name,
      phone,
      email,
      employeeType,
      pan,
      pincode,
      state,
      city,
      gender,
      income,
      dob,
      partner_Id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 400,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (partner_Id !== VALID_RUPEE_READY_ID) {
      return res.status(403).json({
        status: 403,
        error: "Invalid partner_Id. Access denied.",
      });
    }

    if (!panRegex.test(pan)) {
      return res.status(400).json({
        status: 400,
        error: "Invalid PAN format",
      });
    }

    const [userInCustomer, userInPartner] = await Promise.all([
      customer.findOne({ phone, pan }),
      partnerdb.findOne({ phone, pan }),
    ]);

    if (userInCustomer || userInPartner) {
      return res.status(409).json({
        status: 409,
        error: "User is already associated with us",
      });
    }

    const newUser = new partnerdb({
      name,
      phone,
      email,
      employment: employeeType,
      pan,
      state,
      city,
      pincode,
      income,
      gender,
      dob,
      creditScore,
      SalaryType,
      CompanyName,
      UserPostion,
      CompanyAddress,
      CompleteAddress,
      createdAt: new Date(),
      partner_Id,
    });

    await newUser.save();

    return res.status(201).json({
      status: 201,
      message: "User created",
      user: newUser,
    });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ status: 500, error: "Server error" });
  }
});
module.exports = router;
