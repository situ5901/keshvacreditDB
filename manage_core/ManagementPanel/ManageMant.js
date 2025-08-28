const {
  MoneyView,
  MoneyView2,
  smcoll,
  dailyworks,
  LoanTaps,
} = require("../models/CheckLenderSchema");

exports.dashboard = async (req, res) => {
  try {
    return res.json({ message: "Hello from Management panel" });
  } catch (error) {
    res.json({ message: error.message });
  }
};

exports.campianData = async (req, res) => {
  try {
    const MoneyView2 = await MoneyView.find(
      {
        "apiResponse.moneyViewDedupe.message": "No dedupe found",
      },
      {
        phone: 1,
        email: 1,
        pan: 1,
        _id: 0,
      },
    );

    const MVcount = await MoneyView.countDocuments({
      "apiResponse.moneyViewDedupe.message": "No dedupe found",
    });

    const Mpokket = await smcoll.aggregate([
      {
        $match: {
          "apiResponse.MpokketResponse.preApproval.message":
            "Data Accepted Successfully",
        },
      },
      {
        $project: {
          _id: 0,
          data: {
            requestId:
              "$apiResponse.MpokketResponse.preApproval.data.requestId",
            phone: "$phone", // root level phone
            name: "$name", // root level pan
          },
        },
      },
    ]);

    const Mpokket2 = await smcoll.countDocuments({
      "apiResponse.MpokketResponse.preApproval.message":
        "Data Accepted Successfully",
    });

    const SmartCoin = await smcoll.find(
      {
        "apiResponse.message": "Lead created successfully",
      },
      {
        phone: 1,
        pan: 1,
        _id: 0,
      },
    );

    const SmartCoin2 = await smcoll.countDocuments({
      "apiResponse.message": "Lead created successfully",
    });

    return res.json({
      message: "Hello from Management panel",
      MoneyView: {
        MVcount,
        Moneyview: MoneyView2,
      },
      Mpokket: {
        MpokketCampian: Mpokket,
        MpokketCount: Mpokket2,
      },
      SmartCoin: {
        SmartCoinCampian: SmartCoin,
        SmartCoinCount: SmartCoin2,
      },
    });
  } catch (error) {
    res.json({ message: error.message });
  }
};
