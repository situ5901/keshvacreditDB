const XLSX = require("xlsx");
const path = require("path");

const eligibleLenders = [
  {
    name: "HeroFincorp",
    minAge: 21,
    maxAge: 50,
    lenderId: 22,
    minIncome: 15000,
    url: "https://www.herofincorp.com/img/logo_dc3ab7afd1.webp",
    utm: "https://hipl.onelink.me/1OrE?af_ios_url=https%3A%2F%2Floans.apps.herofincorp.com%2Fen%2Fpersonal-loan&af_android_url=https%3A%2F%2Floans.apps.herofincorp.com%2Fen%2Fpersonal-loan&af_web_dp=https%3A%2F%2Floans.apps.herofincorp.com%2Fen%2Fpersonal-loan&af_xp=custom&pid=kesvacredit&is_retargeting=true&af_reengagement_window=30d&c=Partnership&utm_source=partnership&utm_campaign=kesvacredit&utm_content=userid",
  },
  {
    name: "ArthFincare",
    minAge: 21,
    maxAge: 50,
    lenderId: 22,
    minIncome: 15000,
    url: "https://arthfincare.com/_next/static/media/ArthFincareLogo.70333c88.svg",
    utm: "https://arthfincare.com/?utm_source=KeshavaCredit&utm_medium=KeshavaCreditReferral&utm_campaign=basic_referral",
  },
  {
    name: "Ramfin",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    lenderId: 1,
    interestRate: "starting from 0.35% to 0.80% per day",
    loanAmount: "upto 3 Lakh",
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
    interestRate: "starting from 35% per Annum",
    loanAmount: "upto 3 Lakh",
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
    interestRate: "starting from 1.5% per Month",
    loanAmount: "upto 3 Lakh",
    url: "https://www.getzype.com/wp-content/uploads/2024/08/Group-852775729.webp",
    utm: "https://portal.getzype.com/?af_xp=custom&pid=CustomerSource&deep_link_value=myZype&af_click_lookback=30d&c=Sample",
  },
  // {
  //   name: "FDPL",
  //   minAge: 18,
  //   maxAge: 59,
  //   lenderId: 4,
  //   minIncome: 18000,
  //   interestRate: "starting from 12% to 35.95% per Annum",
  //   loanAmount: "upto 5 Lakh",
  //   url: "https://i.postimg.cc/YSfBdxzZ/fdpl.jpg",
  //   utm: "https://web.fatakpay.com/authentication/login?utm_source=575_DLZ56&utm_medium=",
  // },
  // {
  //   name: "FatakPay Short term personal loan",
  //   minAge: 18,
  //   maxAge: 59,
  //   lenderId: 5,
  //   minIncome: 18000,
  //   interestRate: "starting from 12% to 35.95% per Annum",
  //   loanAmount: "starting from 5000 to 1 lakh ",
  //   url: "https://i.postimg.cc/0jzs6xgb/Logo-1.jpg",
  //   utm: "https://web.fatakpay.com/authentication/login?utm_source=576_PPEGA&utm_medium=",
  // },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    lenderId: 6,
    interestRate: "Upto 39% per Annum",
    loanAmount: "upto 3 Lakh",
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
    interestRate: "starting from 2.9166% per Month",
    loanAmount: "upto 3 Lakh",
    url: "https://play-lh.googleusercontent.com/9sBV7LnfSo9QG_sZM9_0sNteV-n7RhWaJ-YQmqn8aFb-eBurWd4kDQCyc4myR21v8zTu=w240-h480-rw",
    utm: "https://salaryontime.com/apply-now?utm_source=Keshvacredit&utm_medium=Keywords&utm_campaign=Keywords&utm_term=Keywords",
  },
  {
    name: "Olyv",
    minAge: 21,
    maxAge: 58,
    lenderId: 8,
    minIncome: 15000,
    interestRate: "starting from 1.5 % per Month",
    loanAmount: "upto 3 Lakh",
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
    utm: "https://applyonline.kamakshimoney.com/",
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    lenderId: 10,
    minIncome: 15000,
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
    utm: "https://loantap.in/",
  },
  // {
  //   name: "MoneyView",
  //   minAge: 21,
  //   maxAge: 60,
  //   lenderId: 11,
  //   minIncome: 15000,
  //   interestRate: "starting from 1.16% per Month",
  //   loanAmount: "upto 3 Lakh",
  //   url: "https://cdn.prod.website-files.com/65b65b84c3edfa5897cdfb0b/66223fca2ba9f44ca226f304_Primary%20logo.png",
  //   utm: "https://moneyview.in/personal-loan?utm_source=KeshvaCredit",
  // },
  {
    name: "BharatLoan",
    minAge: 21,
    maxAge: 60,
    employment: "Salaried",
    minIncome: 15000,
    lenderId: 12,
    interestRate: "starting from 35% per Annum",
    loanAmount: "upto 2 Lakh",
    url: "https://www.bharatloan.com/public/images/brand_logo.png",
    utm: "https://www.bharatloan.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  // {
  //   name: "chintamanifinlease",
  //   minAge: 21,
  //   maxAge: 60,
  //   lenderId: 14,
  //   minIncome: 15000,
  //   interestRate: "starting from 25% per Annum",
  //   loanAmount: "upto 3 Lakh",
  //   url: "https://www.chintamanifinlease.com/public/frontend/images/logo/logo.png",
  //   utm: "https://www.chintamanifinlease.com/keshvacredit?utm_source=quid945&utm_medium=get&utm_campaign=loan-au7!Sh2dff5",
  // },
  {
    name: "instantmudra",
    minAge: 21,
    maxAge: 60,
    lenderId: 15,
    minIncome: 15000,
    interestRate: "Range from 12% to 35.95%  per Annum",
    loanAmount: "upto 5 Lakh",
    url: "https://www.instantmudra.com/images/logo_official.png",
    utm: "https://www.instantmudra.com/apply_loan.php?utm_source=quid&utm_medium=get&utm_campaign=d70e2e18685f38708e175d780390d064ke58",
  },
  {
    name: "clickmyloan",
    minAge: 21,
    maxAge: 60,
    lenderId: 16,
    minIncome: 15000,
    interestRate: "starting from 24% per Annum",
    loanAmount: "upto 5 Lakh",
    url: "https://clickmyloan.com/images/logo.png",
    utm: "https://clickmyloan.cloudbankin.com/onboard/?referral_code=caa39346dc#/home/welcome",
  },
  {
    name: "Mudraboxx",
    minAge: 21,
    maxAge: 58,
    lenderId: 17,
    minIncome: 25000,
    employment: "Salaried",
    interestRate: "starting from 0.3% per Daily",
    loanAmount: "upto 4 Lakh",
    url: "https://mudraboxx.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.ec7e9ff0.png&w=256&q=75",
    utm: "https://mudraboxx.com/apply?utm_source=KesavaCredit&utm_medium=cpc&utm_campaign=kesavacredit-campaign",
  },
  {
    name: "Payme",
    minAge: 21,
    maxAge: 58,
    lenderId: 18,
    minIncome: 15000,
    interestRate: "starting from 1.5 per Month",
    loanAmount: "upto 4 Lakh",
    url: "https://i.postimg.cc/zXphgPXC/logo.jpg",
    utm: "https://web.paymeindia.in/?referrer=",
  },
  {
    name: "Branch",
    minAge: 21,
    maxAge: 58,
    lenderId: 19,
    minIncome: 15000,
    interestRate: "starting from 2% to 18% per Annum",
    loanAmount: "upto 5 Lakh",
    url: "https://d2c5ectx2y1vm9.cloudfront.net/assets/logo-485b81d3b9c7d0948100d5af0c6add2a27271ae40c65cdb6e98be5907ceaee32.png",
    utm: "https://play.google.com/store/apps/details?id=com.branch_international.branch.branch_demo_android&referrer=utm_source%3DKESHVACREDIT",
  },
  {
    name: "CreditSea",
    minAge: 21,
    maxAge: 50,
    lenderId: 20,
    minIncome: 18000,
    interestRate: "starting from 14% to 36% per Annum",
    loanAmount: "upto 3 Lakh",
    url: "https://www.creditsea.com/_next/static/media/credit-sea-blue-h-latest.62519644.svg",
    utm: "https://www.creditsea.com/onboarding/sign-up/enter-mobile?source=31048692",
  },
  {
    name: "CapitalNow",
    minAge: 21,
    maxAge: 58,
    lenderId: 21,
    minIncome: 33000,
    MOS: "bank-Transfer",
    employment: "Salaried",
    url: "https://www.capitalnow.in/images/logo.png",
    utm: "http://bit.ly/opencnapp",
  },
  {
    name: "Kredito24",
    minAge: 21,
    maxAge: 58,
    lenderId: 21,
    minIncome: 20000,
    employment: "Salaried",
    url: "https://kredito24.in/img/site/logo-new-r.svg",
    utm: "https://kredito24.afflnx.com/c/4d5d956b7a614?ext_click_id=&subsource=",
  },

  {
    name: "InstaMoney",
    minAge: 21,
    maxAge: 58,
    lenderId: 21,
    minIncome: 20000,
    employment: "Salaried",
    url: "https://www.instamoney.app/wp-content/uploads/2025/03/InstaMoney-Logo.png",
    utm: "https://loan.instamoney.app/partner?partner_id=im_web&la_code=KC",
  },
  {
    name: "TrustPaisa",
    minAge: 21,
    maxAge: 58,
    lenderId: 21,
    minIncome: 20000,
    employment: "Salaried",
    url: "https://static.trustpaisa.com/logos/full.svg",
    utm: "https://trustpaisa.com/?utm_source=keshvacredit&utm_medium=cpa&click_id=1111111",
  },

  {
    name: "Loan112",
    minAge: 21,
    maxAge: 58,
    lenderId: 21,
    minIncome: 25000,
    employment: "Salaried",
    url: "https://www.loan112.com/public/front/img/logo_Loan112.svg",
    utm: "https://www.loan112.com/apply-now?utm_source=KESHVACREDIT&utm_medium=KESHVACREDITWEB&utm_campaign=KESHVACREDITWEBCAMPAIGN",
  },

  {
    name: "BrightLoan",
    minAge: 21,
    maxAge: 58,
    lenderId: 21,
    minIncome: 25000,
    employment: "Salaried",
    url: "https://www.loan112.com/public/front/img/logo_Loan112.svg",
    utm: "https://www.loan112.com/apply-now?utm_source=KESHVACREDIT&utm_medium=KESHVACREDITWEB&utm_campaign=KESHVACREDITWEBCAMPAIGN",
  },
];

const lenderFiles = {
  Rupee: path.join(__dirname, "./pincode/rupee.xlsx"),
  MoneyView: path.join(__dirname, "./pincode/mv.xlsx"),
  Loan112: path.join(__dirname, "./pincode/Loan112.csvp"),
  BrightLoan: path.join(__dirname, "./pincode/BrightLoan.csv"),
};

// ✅ Attach pincodes from Excel
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
      console.error(`Error reading ${excelPath}:`, err.message);
      lender.pincodes = [];
    }
  } else {
    lender.pincodes = [];
  }
});

// ✅ Filtering function
async function filterLenders(age, income, loan, employment, pincode) {
  if (!age || !income || !loan) return [];

  return eligibleLenders
    .filter((lender) => {
      const matchesEmployment =
        !lender.employment || lender.employment === employment;

      if (
        ["Rupee", "MoneyView", "Loan112", "BrightLoan"].includes(lender.name)
      ) {
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
      interestRate: lender.interestRate || "starting from 10.99% per annum",
      loanAmount: lender.loanAmount || "upto 5 Lakh",
    }));
}

module.exports = filterLenders;
