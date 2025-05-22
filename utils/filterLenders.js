const eligibleLenders = [
  {
    name: "Ramfin",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    maxIncome: 30000,
    minLoan: 50000,
    maxLoan: 80000,
  },
  {
    name: "Zype",
    minAge: 21,
    maxAge: 55,
    minIncome: 25000,
    maxIncome: 50000,
    minLoan: 60000,
    maxLoan: 100000,
  },
  {
    name: "FatakPay",
    minAge: 18,
    maxAge: 35,
    minIncome: 18000,
    maxIncome: 40000,
    minLoan: 55000,
    maxLoan: 90000,
  },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    maxIncome: 20000,
    minLoan: 50000,
    maxLoan: 75000,
  },
  {
    name: "smartCoin",
    minAge: 21,
    maxAge: 58,
    minIncome: 30000,
    maxIncome: 100000,
    minLoan: 80000,
    maxLoan: 100000,
  },
  {
    name: "Kamakshi",
    minAge: 21,
    maxAge: 50,
    minIncome: 20000,
    maxIncome: 30000,
    minLoan: 50000,
    maxLoan: 80000,
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    minIncome: 40000,
    maxIncome: 150000,
    minLoan: 70000,
    maxLoan: 100000,
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
