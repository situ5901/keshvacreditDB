const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs"); // For x-www-form-urlencoded

router.post("/partner/smartcoin/lead", async (req, res) => {
  try {
    const { phone, pan, email, income, employment, dob, name } = req.body;

    const payload = {
      phone_number: String(phone),
      pan: pan,
      employment_type: employment,
      net_monthly_income: income || 0,
      name_as_per_pan: name,
      date_of_birth: dob,
      Partner_id: "Keshvacredit",
    };

    const response = await axios.post(
      "https://leads.smartcoin.co.in/partner/keshvacredit/lead/create",
      qs.stringify(payload),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "admin-api-client-id": "SC_KVCD_oruwm5w5fXy4JNoi",
          "admin-api-client-key": "esy7kphMG6G9hu90",
        },
      },
    );

    res.status(response.status).send(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).send({ error: error.message });
    }
  }
});

module.exports = router;
