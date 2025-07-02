const eligibleLenders = [
  {
    name: "Ramfin",
    minAge: 21,
    maxAge: 55,
    minIncome: 15000,
    url: "https://www.ramfincorp.com/images/logo.png",
    utm: "https://applyonline.ramfincorp.com/?utm_source=keshvacredit",
  },
  {
    name: "Rupee",
    minAge: 21,
    maxAge: 55,
    employment: "Salaried",
    minIncome: 15000,
    url: "https://www.rupee112.com/public/images/brand_logo.png",
    utm: "https://www.rupee112.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Zype",
    minAge: 21,
    maxAge: 55,
    employment: "Salaried",
    minIncome: 15000,
    url: "https://www.getzype.com/wp-content/uploads/2024/08/Group-852775729.webp",
    utm: "https://zype.sng.link/Ajygt/1ba7?_dl=com.zype.mobile&_smtype=3",
  },
  {
    name: "FatakPay",
    minAge: 18,
    maxAge: 59,
    minIncome: 18000,
    url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ec/a2/99/eca29916-a53d-50f1-f5b5-c044b70ee4f3/AppIcon-0-0-1x_U007emarketing-0-6-0-85-220.png/1200x600wa.png",
    utm: "https://web.fatakpay.com/authentication/login?utm_source=558_POVVE&utm_medium=",
  },

  {
    name: "FatakPayDCL",
    minAge: 18,
    maxAge: 59,
    minIncome: 18000,
    url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ec/a2/99/eca29916-a53d-50f1-f5b5-c044b70ee4f3/AppIcon-0-0-1x_U007emarketing-0-6-0-85-220.png/1200x600wa.png",
    utm: "https://web.fatakpay.com/authentication/login?utm_source=558_POVVE&utm_medium=",
  },
  {
    name: "Mpokket",
    minAge: 18,
    maxAge: 60,
    minIncome: 10000,
    url: "https://mir-s3-cdn-cf.behance.net/project_modules/source/302bf6105854045.5f82a86549930.png",
    utm: "https://web.mpokket.in/?utm_source=keshvacredit&utm_medium=keshvacredit",
  },
  {
    name: "salaryontime",
    minAge: 18,
    maxAge: 60,
    employment: "Salaried",
    minIncome: 10000,
    url: "https://play-lh.googleusercontent.com/9sBV7LnfSo9QG_sZM9_0sNteV-n7RhWaJ-YQmqn8aFb-eBurWd4kDQCyc4myR21v8zTu=w240-h480-rw",
    utm: "https://salaryontime.com/apply-now?utm_source=Keshvacredit&utm_medium=Keywords&utm_campaign=Keywords&utm_term=Keywords",
  },
  {
    name: "smartCoin",
    minAge: 21,
    maxAge: 58,
    minIncome: 15000,
    url: "https://framerusercontent.com/images/csl8apTjCrYTK5Qi20a4osUIHw.png?scale-down-to=512",
    utm: "https://app.olyv.co.in/?utm_source=KeshvaCredit_Web&utm_campaign=KeshvaCredit_1",
  },
  {
    name: "Kamakshi",
    minAge: 21,
    maxAge: 50,
    minIncome: 20000,
    url: "https://www.kamakshimoney.com/index_files/finpath-loan-logo.svg",
    utm: "no data",
  },
  {
    name: "LoanTap",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    url: "https://i.postimg.cc/sgkVCJpQ/download.png",
    utm: "no data",
  },
  {
    name: "MoneyView",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    url: "https://moneyview.in/images/mv-green-logo-v3Compressed.svg",
    utm: "no data",
  },
  {
    name: "BharatLoan",
    minAge: 21,
    maxAge: 60,
    employment: "Salaried",
    minIncome: 15000,
    url: "https://www.bharatloan.com/public/images/brand_logo.png",
    utm: "https://www.bharatloan.com/apply-now?utm_source=KESHVACREDIT&utm_medium=",
  },
  {
    name: "Flot",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    url: "https://myflot.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FlogoImage.176890a7.png&w=384&q=75",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
  {
    name: "chintamanifinlease",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
    url: "https://about.me/cdn-cgi/image/q=80,dpr=1,f=auto,fit=cover,w=1200,h=630,gravity=0.153x0.283/https://assets.about.me/background/users/c/h/i/chintamanifinlease_1583412727_852.jpg",
    utm: "https://myflot.com/?utm_source=Keshvacredit&utm_medium=%7B_medium%7D&utm_campaign=%7B_campaign%7D",
  },
  {
    name: "instantmudra",
    minAge: 21,
    maxAge: 60,
    minIncome: 15000,
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
];

async function filterLenders(age, income, loan, employment) {
  if (!age || !income || !loan) return [];

  const filteredLenders = eligibleLenders.reduce((acc, lender) => {
    const matchesEmployment =
      !lender.employment || lender.employment === employment;

    if (
      lender.minAge <= age &&
      lender.maxAge >= age &&
      matchesEmployment &&
      lender.minIncome <= income
    ) {
      acc.push({
        name: lender.name,
        url: lender.url,
        utm: lender.utm || "no data",
      });
    }
    return acc;
  }, []);

  return filteredLenders;
}

// Example user data
const user = {
  dob: "1998-05-20", // please use yyyy-mm-dd
  income: 25000,
  loanAmount: 100000,
  employment: "Salaried",
};

// calculate from user data
const dobDate = new Date(user.dob);
const age = new Date().getFullYear() - dobDate.getFullYear();
const income = user.income;
const loanAmount = user.loanAmount;
const employment = user.employment;

// run filter
filterLenders(age, income, loanAmount, employment)
  .then((result) => {})
  .catch((err) => {
    console.error(err);
  });

module.exports = filterLenders;
