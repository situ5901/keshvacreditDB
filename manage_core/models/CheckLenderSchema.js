// models/MoneyView.js
const mongoose = require('mongoose');

const moneyViewSchema = new mongoose.Schema({
  apiResponse: {
    moneyViewDedupe: {
      message: String
    }
  }
}, { strict: false }); // 'strict: false' for flexible documents

module.exports = mongoose.model('MoneyView', moneyViewSchema);
