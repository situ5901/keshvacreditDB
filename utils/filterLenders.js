const XLSX = require("xlsx");
const path = require("path");

const eligibleLenders = [
  {
    name: "Ramfin",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    lenderId: 1,
    url: "https://www.ramfincorp.com/images/logo.png",
    utm: "https://applyonline.ramfincorp.com/?utm_source=keshvacredit",
  },
  {
    name: "Rupee",
    minAge: 21,
    maxAge: 55,
    employment: "Salaried",
    lenderId: 2,
    minIncome: 15000,
    url: "https://www.rupee112.com/public/images/brand_logo.png",
    utm: "https://www.rupee112.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Zype",
    minAge: 21,
    maxAge: 55,
    lenderId: 3,
    employment: "Salaried",
    minIncome: 15000,
    url: "https://www.getzype.com/wp-content/uploads/2024/08/Group-852775729.webp",
    utm: "https://zype.sng.link/Ajygt/1ba7?_dl=com.zype.mobile&_smtype=3",
  },
  {
    name: "FatakPay",
    minAge: 18,
    maxAge: 59,
    lenderId: 4,
    minIncome: 18000,
    url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ec/a2/99/eca29916-a53d-50f1-f5b5-c044b70ee4f3/AppIcon-0-0-1x_U007emarketing-0-6-0-85-220.png/1200x600wa.png",
    utm: "https://web.fatakpay.com/authentication/login?utm_source=558_POVVE&utm_medium=",
  },
  {
    name: "FatakPayDCL",
    minAge: 18,
    maxAge: 59,
    lenderId: 5,
    minIncome: 18000,
    url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ec/a2/99/eca29916-a53d-50f1-f5b5-c044b70ee4f3/AppIcon-0-0-1x_U007emarketing-0-6-0-85-220.png/1200x600wa.png",
    utm: "https://web.fatakpay.com/authentication/login?utm_source=558_POVVE&utm_medium=",
  },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    lenderId: 6,
    url: "https://mir-s3-cdn-cf.behance.net/project_modules/source/302bf6105854045.5f82a86549930.png",
    utm: "https://web.mpokket.in/?utm_source=keshvacredit&utm_medium=keshvacredit",
  },
  {
    name: "salaryontime",
    minAge: 18,
    maxAge: 60,
    lenderId: 7,
    employment: "Salaried",
    minIncome: 10000,
    url: "https://play-lh.googleusercontent.com/9sBV7LnfSo9QG_sZM9_0sNteV-n7RhWaJ-YQmqn8aFb-eBurWd4kDQCyc4myR21v8zTu=w240-h480-rw",
    utm: "https://salaryontime.com/apply-now?utm_source=Keshvacredit&utm_medium=Keywords&utm_campaign=Keywords&utm_term=Keywords",
  },
  {
    name: "smartCoin",
    minAge: 21,
    maxAge: 58,
    lenderId: 8,
    minIncome: 15000,
    url: "https://framerusercontent.com/images/csl8apTjCrYTK5Qi20a4osUIHw.png?scale-down-to=512",
    utm: "https://app.olyv.co.in/?utm_source=KeshvaCredit_Web&utm_campaign=KeshvaCredit_1",
  },
  {
    name: "Kamakshi",
    minAge: 21,
    maxAge: 50,
    lenderId: 9,
    minIncome: 20000,
    url: "https://s3.ap-south-1.amazonaws.com/cdn-kamakshimoney.com/public/front/images/logo.png",
    utm: "no data",
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    lenderId: 10,
    minIncome: 15000,
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
    utm: "no data",
  },
  {
    name: "MoneyView",
    minAge: 21,
    maxAge: 60,
    lenderId: 11,
    minIncome: 15000,
    url: "https://cdn.prod.website-files.com/65b65b84c3edfa5897cdfb0b/66223fca2ba9f44ca226f304_Primary%20logo.png",
    utm: "https://moneyview.in/personal-loan?utm_source=KeshvaCredit",
  },
  {
    name: "BharatLoan",
    minAge: 21,
    maxAge: 60,
    employment: "Salaried",
    minIncome: 15000,
    lenderId: 12,
    url: "https://www.bharatloan.com/public/images/brand_logo.png",
    utm: "https://www.bharatloan.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Flot",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    lenderId: 13,
    url: "https://myflot.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FlogoImage.176890a7.png&w=384&q=75",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
  {
    name: "chintamanifinlease",
    minAge: 21,
    maxAge: 60,
    lenderId: 14,
    minIncome: 15000,
    url: "https://about.me/cdn-cgi/image/q=80,dpr=1,f=auto,fit=cover,w=1200,h=630,gravity=0.153x0.283/https://assets.about.me/background/users/c/h/i/chintamanifinlease_1583412727_852.jpg",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
  {
    name: "instantmudra",
    minAge: 21,
    maxAge: 60,
    lenderId: 15,
    minIncome: 15000,
    url: "https://www.instantmudra.com/images/logo_official.png",
    utm: "https://www.instantmudra.com/apply_loan.php?utm_source=quid&utm_medium=get&utm_campaign=d70e2e18685f38708e175d780390d064ke58",
  },
  {
    name: "clickmyloan",
    minAge: 21,
    maxAge: 60,
    lenderId: 16,
    minIncome: 15000,
    url: "https://clickmyloan.com/images/logo.png",
    utm: "https://clickmyloan.cloudbankin.com/onboard/?referral_code=caa39346dc#/home/welcome",
  },
  {
    name: "Mudraboxx",
    minAge: 21,
    maxAge: 58,
    lenderId: 17, // changed
    minIncome: 25000,
    employment: "Salaried",
    url: "https://mudraboxx.com/favicon.ico",
    utm: "https://mudraboxx.com/apply?utm_source=KesavaCredit&utm_medium=cpc&utm_campaign=kesavacredit-campaign&utm_term={utm_term}&utm_content={utm_content}&utm_id={utm_id}&product_id={product_id}&location={location}&gclid={gclid}",
  },
  {
    name: "Payme",
    minAge: 21,
    maxAge: 58,
    lenderId: 18, // changed
    minIncome: 15000,
    url: "https://www.paymeindia.in/logo.svg",
    utm: "https://web.paymeindia.in/?referrer=",
  },
  {
    name: "Branch",
    minAge: 21,
    maxAge: 58,
    lenderId: 19, // changed
    minIncome: 15000,
    url: "https://d2c5ectx2y1vm9.cloudfront.net/assets/logo-485b81d3b9c7d0948100d5af0c6add2a27271ae40c65cdb6e98be5907ceaee32.png",
    utm: "https://play.google.com/store/apps/details?id=com.branch_international.branch.branch_demo_android&referrer=utm_source%3DKESHVACREDIT%26lead_id%3D",
  },
  {
    name: "CapitalNow",
    minAge: 21,
    maxAge: 58,
    lenderId: 20,
    minIncome: 33000,
    MOS: "bank-Transfer",
    employment: "Salaried",
    url: "https://www.capitalnow.in/images/logo.png",
    utm: "no data",
  },
];

const lenderFiles = {
  Rupee: path.join(__dirname, "./pincode/rupee.xlsx"),
  MoneyView: path.join(__dirname, "./pincode/mv.xlsx"),
};

// Attach pincodes from Excel
eligibleLenders.forEach((lender) => {
  const excelPath = lenderFiles[lender.name];
  if (excelPath) {
    try {
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0]; // always take first sheet
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      lender.pincodes = data
        .map((row) => row.Pincode && row.Pincode.toString().trim())
        .filter(Boolean);
    } catch (err) {
      console.error(Error reading ${excelPath}:, err.message); // ✅ fixed
      lender.pincodes = [];
    }
  } else {
    lender.pincodes = [];
  }
});

async function filterLenders(age, income, loan, employment, pincode) {
  if (!age || !income || !loan) return [];

  return eligibleLenders
    .filter((lender) => {
      const matchesEmployment =
        !lender.employment || lender.employment === employment;

      if (["Rupee", "MoneyView"].includes(lender.name)) {
        const matchesPincode =
          lender.pincodes.length > 0 && lender.pincodes.includes(pincode);
        return (
          lender.minAge <= age &&
          lender.maxAge >= age &&
          matchesEmployment &&
          lender.minIncome <= income &&
          matchesPincode
        );
      }

      // 👉 Baaki sab lenders bina pincode ke filter honge
      return (
        lender.minAge <= age &&
        lender.maxAge >= age &&
        matchesEmployment &&
        lender.minIncome <= income
      );
    })
    .map((lender) => ({
      name: lender.name,
      url: lender.url,
      utm: lender.utm || "no data",
    }));
}
module.exports = filterLenders;
