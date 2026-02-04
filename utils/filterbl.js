const XLSX = require("xlsx");
const path = require("path");

// 1. Array of Lenders
const eligibleBusinessLenders = [
  {
    id: 1,
    name: "Faircent",
    logo: "https://i.postimg.cc/pXYb8kmC/imgi-1-logo-new.png",
    minAge: 21,
    maxAge: 60,
    requiresGST: true,
    minVintage: 0,
    approval: "98%",
    amount: "Up to ₹2 crore",
    interest: "12% p.a.",
    tenure: "1–5 years",
    features: ["Quick Disbursal", "Low Paperwork", "Flexible Tenure"],
    applyLink: "/business-loan/businessapi/faircent",
  },
  {
    id: 5,
    name: "Indifi",
    minAge: 22,
    maxAge: 55,
    requiresGST: true,
    minVintage: 1,
    approval: "97%",
    amount: "Up to ₹2 crore",
    interest: "Starting from 11% to 15% per annum",
    tenure: "1–5 years",
    features: ["Quick Disbursal", "Low Paperwork", "Flexible Tenure"],
    applyLink: "https://www.indifi.com/associate/keshvacredit",
  },
  {
    id: 2,
    name: "Protium",
    minAge: 21,
    maxAge: 65,
    requiresGST: false,
    minVintage: 0,
    approval: "98%",
    amount: "Up to ₹2 crore",
    interest: "12% p.a.",
    tenure: "1–5 years",
    features: ["Quick Disbursal", "Low Paperwork", "Flexible Tenure"],
    applyLink:
      "https://dbl.protium.co.in/?utm_source=keshvacredit&utm_medium=digital&utm_campaign=standard",
  },
  {
    id: 3,
    name: "Muthoot FinCorp",
    minAge: 21,
    maxAge: 60,
    requiresGST: false,
    minVintage: 0,
    approval: "98%",
    amount: "Up to ₹2 crore",
    interest: "Starting from 11% to 15% per annum",
    tenure: "1–5 years",
    features: ["Quick Disbursal", "Low Paperwork", "Flexible Tenure"],
    applyLink:
      "https://creditlink.finbox.in/?partnerCode=LS_NUSHZC&agentCode=sc112779&productType=business_loan_edi",
  },
  {
    id: 4,
    name: "FlexiLoans",
    minAge: 21,
    maxAge: 55,
    requiresGST: true,
    minVintage: 0,
    approval: "97%",
    amount: "range from 50,000 - 50 lakh",
    interest: "Starting from 12% to 18% per annum",
    tenure: "1–5 years",
    features: ["Quick Disbursal", "Low Paperwork", "Flexible Tenure"],
    applyLink:
      "https://loans.flexiloans.com/?nlp=1&partnerCode=68d3d536ax0kt&utm_source=partner&utm_medium=keshvacredit&utm_campaign=",
  },
];

// 2. Mapping Files to Lender Names
const lenderFiles = {
  Indifi: path.join(__dirname, "./pincode/Indify.xlsx"), // Fixed spelling
};

// 3. Pre-load Excel Data into Sets (Optimized for performance)
eligibleBusinessLenders.forEach((lender) => {
  const excelPath = lenderFiles[lender.name];
  if (excelPath) {
    try {
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const pincodeList = data
        .map((row) => {
          const val = row.Pincode || row.pincode || row.PINCODE;
          return val ? val.toString().trim() : null;
        })
        .filter(Boolean);

      lender.pincodes = new Set(pincodeList);
    } catch (err) {
      console.error(`Error reading ${lender.name} file:`, err.message);
      lender.pincodes = new Set();
    }
  } else {
    lender.pincodes = new Set();
  }
});

/**
 * 4. Logic for Filtering Lenders
 * @param {number} age - User Age
 * @param {string} Gst - "yes" or "no"
 * @param {number} loan - Loan Amount
 * @param {string} employment - Type of employment
 * @param {number|string} userVintage - Business vintage in years
 * @param {string|number} userPincode - User's current pincode
 */
async function BLfilterLenders(
  age,
  Gst,
  loan,
  employment,
  userVintage,
  userPincode,
) {
  if (!age || !Gst || !loan) return [];

  const userHasGst = Gst.toLowerCase() === "yes";
  const empStatus = employment ? employment.toLowerCase() : "";
  const numericVintage = parseFloat(userVintage) || 0;
  const searchPincode = userPincode ? userPincode.toString().trim() : "";

  return eligibleBusinessLenders
    .filter((lender) => {
      // Age Check
      const matchesAge = age >= lender.minAge && age <= lender.maxAge;

      // GST Check
      const matchesGst = lender.requiresGST ? userHasGst : true;

      // Vintage Check
      const matchesVintage = numericVintage >= (lender.minVintage || 0);

      // Employment Check
      const matchesEmployment =
        !lender.employment || lender.employment.toLowerCase() === empStatus;

      // Pincode Check: If lender has a list, user must match. If no list, everyone passes.
      const matchesPincode =
        lender.pincodes.size > 0 ? lender.pincodes.has(searchPincode) : true;

      return (
        matchesAge &&
        matchesGst &&
        matchesVintage &&
        matchesEmployment &&
        matchesPincode
      );
    })
    .map((lender) => ({
      id: lender.id,
      name: lender.name,
      logo: lender.logo,
      approval: lender.approval,
      amount: lender.amount,
      interest: lender.interest,
      tenure: lender.tenure,
      features: lender.features,
      applyLink: lender.applyLink,
    }));
}

module.exports = BLfilterLenders;
