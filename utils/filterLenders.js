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
  },
  {
    name: "Zype",
    minAge: 21,
    maxAge: 55,
    minIncome: 25000,
    maxIncome: 50000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://www.getzype.com/wp-content/uploads/2024/08/Group-852775729.webp",
  },
  {
    name: "FatakPay",
    minAge: 18,
    maxAge: 35,
    minIncome: 18000,
    maxIncome: 40000,
    minLoan: 500,
    maxLoan: 90000,
    url: "https://web.fatakpay.com/assets/images/logo/Logo.svg",
  },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    maxIncome: 20000,
    minLoan: 500,
    maxLoan: 75000,
    url: "https://cdn.prod.website-files.com/64ea130f10713e77f6320da4/67ac2defec09b58763dac780_Logo_Full_mPokket_2312_R01.svg",
  },
  {
    name: "smartCoin",
    minAge: 21,
    maxAge: 58,
    minIncome: 30000,
    maxIncome: 100000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://framerusercontent.com/images/csl8apTjCrYTK5Qi20a4osUIHw.png?scale-down-to=512",
  },
  {
    name: "Kamakshi",
    minAge: 21,
    maxAge: 50,
    minIncome: 20000,
    maxIncome: 2000,
    minLoan: 500,
    maxLoan: 80000,
    url: "https://www.kamakshimoney.com/index_files/finpath-loan-logo.svg",
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    minIncome: 40000,
    maxIncome: 150000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
  },
  {
    name: "BharatLoan",
    minAge: 21,
    maxAge: 60,
    minIncome: 40000,
    maxIncome: 150000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
  },
  {
    name: "Flot",
    minAge: 21,
    maxAge: 60,
    minIncome: 40000,
    maxIncome: 150000,
    minLoan: 500,
    maxLoan: 100000,
    url: "https://myflot.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FlogoImage.176890a7.png&w=384&q=75",
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
      acc.push(lender.name);
    }
    return acc;
  }, []);

  return filteredLenders;
}

module.exports = filterLenders;
