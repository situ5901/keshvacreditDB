const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function loadAllPincodeData(folderPath) {
  const files = fs.readdirSync(folderPath);
  const pincodeMap = {};

  files.forEach((file) => {
    if (!file.endsWith(".xlsx")) return;
    const lenderName = path.basename(file, ".xlsx").toLowerCase();

    const workbook = XLSX.readFile(path.join(folderPath, file));
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Assume har row me "pincode" column hai
    pincodeMap[lenderName] = data.map((row) => String(row.pincode));
  });

  return pincodeMap;
}

module.exports = loadAllPincodeData;
