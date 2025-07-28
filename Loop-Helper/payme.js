const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGODB_URINEW = process.env.MONGODB_URINEW;
const BATCH_SIZE = 1;
