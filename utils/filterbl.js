const eligibleBusinessLenders = [
  {
    id: 1,
    name: "Faircent",
    logo: "https://i.postimg.cc/pXYb8kmC/imgi-1-logo-new.png",
    minAge: 21,
    maxAge: 60,
    requiresGST: true, // Is lender ko GST chahiye
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
    requiresGST: false, // Isko GST nahi chahiye toh bhi chalega
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
    approval: "97%",
    amount: "range from 50,000 - 50 lakh",
    interest: "Starting from 12% to 18% per annum",
    tenure: "1–5 years",
    features: ["Quick Disbursal", "Low Paperwork", "Flexible Tenure"],
    applyLink:
      "https://loans.flexiloans.com/?nlp=1&partnerCode=68d3d536ax0kt&utm_source=partner&utm_medium=keshvacredit&utm_campaign=",
  },
];

async function BLfilterLenders(age, Gst, loan, employment) {
  if (!age || !Gst || !loan) return [];

  const userHasGst = Gst.toLowerCase() === "yes";
  const empStatus = employment ? employment.toLowerCase() : "";

  return eligibleBusinessLenders
    .filter((lender) => {
      const matchesAge = age >= lender.minAge && age <= lender.maxAge;

      const matchesGst = lender.requiresGST ? userHasGst : true;

      const matchesEmployment =
        !lender.employment || lender.employment.toLowerCase() === empStatus;

      return matchesAge && matchesGst && matchesEmployment;
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
