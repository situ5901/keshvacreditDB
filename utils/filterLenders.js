const eligibleLenders = [
  {
    name: "Ramfin",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://www.ramfincorp.com/images/logo.png",
    utm: "https://applyonline.ramfincorp.com/?utm_source=keshvacredit",
  },
  {
    name: "Rupee",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    employmentTypes: ["salaried"],
    url: "https://www.rupee112.com/public/images/brand_logo.png",
    utm: "https://www.rupee112.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Zype",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    employmentTypes: ["salaried"],
    url: "https://www.getzype.com/wp-content/uploads/2024/08/Group-852775729.webp",
    utm: "https://zype.sng.link/Ajygt/1ba7?_dl=com.zype.mobile&_smtype=3",
  },
  {
    name: "FatakPay",
    minAge: 18,
    maxAge: 59,
    minIncome: 18000,
    employmentTypes: ["salaried", "self"],
    url: "https://cashkuber.com/assets/images/assets/fatakpay.png",
    utm: "https://web.fatakpay.com/authentication/login?utm_source=558_POVVE&utm_medium=",
  },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    employmentTypes: ["salaried", "self"],
    url: "https://mir-s3-cdn-cf.behance.net/project_modules/source/302bf6105854045.5f82a86549930.png",
    utm: "https://web.mpokket.in/?utm_source=keshvacredit&utm_medium=keshvacredit",
  },

  {
    name: "salaryontime",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    employmentTypes: ["salaried"],
    url: "https://play-lh.googleusercontent.com/9sBV7LnfSo9QG_sZM9_0sNteV-n7RhWaJ-YQmqn8aFb-eBurWd4kDQCyc4myR21v8zTu=w240-h480-rw",
    utm: "https://salaryontime.com/apply-now?utm_source=Keshvacredit&utm_medium=Keywords&utm_campaign=Keywords&utm_term=Keywords ",
  },
  {
    name: "smartCoin",
    minAge: 21,
    maxAge: 58,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://framerusercontent.com/images/csl8apTjCrYTK5Qi20a4osUIHw.png?scale-down-to=512",
    utm: "https://app.olyv.co.in/?utm_source=KeshvaCredit_Web&utm_campaign=KeshvaCredit_1",
  },
  {
    name: "Kamakshi",
    minAge: 21,
    maxAge: 50,
    minIncome: 20000,
    employmentTypes: ["salaried", "self"],
    url: "https://www.kamakshimoney.com/index_files/finpath-loan-logo.svg",
    utm: "no data",
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
  },

  {
    name: "MoneyView",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://moneyview.in/images/mv-green-logo-v3Compressed.svg",
    utm: "no data",
  },
  {
    name: "BharatLoan",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried"],
    url: "https://www.bharatloan.com/public/images/brand_logo.png",
    utm: "https://www.bharatloan.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Flot",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: [check],
    url: "https://myflot.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FlogoImage.176890a7.png&w=384&q=75",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
  {
    name: "chintamanifinlease",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://www.chintamanifinlease.com/",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
  {
    name: "instantmudra",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://www.instantmudra.com/images/logo_official.png",
    utm: "no data",
  },
  {
    name: "clickmyloan",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    url: "https://clickmyloan.com/images/logo.png",
    utm: "no data",
  },
  {
    name: "fatakpaypl",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://fatakpay.com/assets/images/logo/Logo.svg",
    utm: "no data",
  },
  {
    name: "fatakpaydcl",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    employmentTypes: ["salaried", "self"],
    url: "https://fatakpay.com/assets/images/logo/Logo.svg",
    utm: "no data",
  },
];
async function filterLenders(age, income, loan, employmentType) {
  if (!age || !income || !loan || !employmentType) return [];

  const filteredLenders = eligibleLenders.reduce((acc, lender) => {
    if (
      lender.minAge <= age &&
      lender.maxAge >= age &&
      lender.minIncome <= income &&
      (!lender.employmentTypes ||
        lender.employmentTypes.includes(employmentType.toLowerCase()))
    ) {
      acc.push({
        name: lender.name,
        url: lender.url,
        utm: lender.utm,
      });
    }
    return acc;
  }, []);

  return filteredLenders;
}

module.exports = filterLenders;
