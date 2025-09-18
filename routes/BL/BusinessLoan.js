const router = require("express").Router();
const BLSchema = require("./BLSchema.js");

router.post("/form", async (req, res) => {
  try {
    const { phone, email } = req.body;

    const existingUser = await BLSchema.findOne({
      $or: [{ phone }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        status: 409,
        error: "User with this phone or email already exists",
      });
    }

    // Save entire req.body directly
    const newUser = new BLSchema(req.body);
    const savedUser = await newUser.save();

    res.status(201).json({
      status: "success",
      message: "User information saved successfully",
      user: savedUser,
    });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

module.exports = router;
