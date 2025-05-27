const eligibleLenders = [
  {
    name: "Ramfin",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    maxIncome: 30000,
    minLoan: 500,
    maxLoan: 80000,
    url: "https://www.ramfincorp.com/images/logo.png",
    utm: "https://applyonline.ramfincorp.com/?utm_source=keshvacredit",
  },

  {
    name: "Rupee",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    maxIncome: 30000,
    minLoan: 500,
    maxLoan: 80000,
    url: "https://www.rupee112.com/public/images/brand_logo.png",
    utm: "https://www.rupee112.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Zype",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    maxIncome: 50000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://www.getzype.com/wp-content/uploads/2024/08/Group-852775729.webp",
    utm: "https://zype.sng.link/Ajygt/1ba7?_dl=com.zype.mobile&_smtype=3",
  },
  {
    name: "FatakPay",
    minAge: 18,
    maxAge: 35,
    minIncome: 18000,
    maxIncome: 40000,
    minLoan: 500,
    maxLoan: 90000,
    url: "https://cashkuber.com/assets/images/assets/fatakpay.png",
    utm: "https://web.fatakpay.com/authentication/login?utm_source=558_POVVE&utm_medium=",
  },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    maxIncome: 20000,
    minLoan: 500,
    maxLoan: 75000,
    url: "https://mir-s3-cdn-cf.behance.net/project_modules/source/302bf6105854045.5f82a86549930.png",
    utm: "https://web.mpokket.in/?utm_source=keshvacredit&utm_medium=keshvacredit",
  },
  {
    name: "smartCoin",
    minAge: 21,
    maxAge: 58,
    minIncome: 15000,
    maxIncome: 100000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://framerusercontent.com/images/csl8apTjCrYTK5Qi20a4osUIHw.png?scale-down-to=512",
    utm: "https://app.olyv.co.in/?utm_source=KeshvaCredit_Web&utm_campaign=KeshvaCredit_1",
  },
  {
    name: "Kamakshi",
    minAge: 21,
    maxAge: 50,
    minIncome: 20000,
    maxIncome: 2000,
    minLoan: 500,
    maxLoan: 80000,
    url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKwaRh-gK3h-15zdaN4ek-_lGArWiCigwCsA&s",
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    maxIncome: 150000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
  },
  {
    name: "BharatLoan",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    maxIncome: 150000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://www.bharatloan.com/public/images/brand_logo.png",
    utm: "https://www.bharatloan.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Flot",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    maxIncome: 150000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://myflot.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FlogoImage.176890a7.png&w=384&q=75",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
];
async function filterLenders(age, income, loan) {
  if (!age || !income || !loan) return [];

  const filteredLenders = eligibleLenders.reduce((acc, lender) => {
    if (
      lender.minAge <= age &&
      lender.maxAge >= age &&
      lender.minIncome <= income &&
      lender.minLoan <= loan &&
      lender.maxLoan >= loan
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
