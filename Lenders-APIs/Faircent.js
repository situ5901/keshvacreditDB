const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/faircent/upload", upload.single("docImage"), async (req, res) => {
  try {
    const { type, loan_id } = req.body;
    const accessToken = req.header("x-access-token");
    const file = req.file;

    if (!type || !loan_id || !file || !accessToken) {
      return res.status(400).json({
        success: false,
        message: "type, loan_id, docImage, x-access-token required",
      });
    }

    const ext = path.extname(file.originalname) || "";
    const finalPath = path.join(__dirname, "uploads", `${file.filename}${ext}`);
    fs.renameSync(file.path, finalPath);

    const form = new FormData();
    form.append("type", type);
    form.append("loan_id", loan_id);
    form.append("docImage", fs.createReadStream(finalPath), {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(
      "https://api.faircent.com/v1/api/uploadprocess",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "x-application-id": "1cfa78742af22b054a57fac6cf830699",
          "x-application-name": "KESHVACREDIT",
          "x-access-token": accessToken,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: "text", // <-- Treat response as text
      },
    );

    // Manual JSON parse
    let data;
    try {
      data = JSON.parse(response.data);
    } catch (e) {
      data = { success: true, message: response.data };
    }

    return res.status(200).json({
      success: data.success,
      message: data.message,
      data,
      filePath: finalPath,
    });
  } catch (err) {
    console.error("❌ Upload API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
      error: err.response?.data || err.message,
    });
  }
});
