const partnerApiKeys = {
  "1234567890abcdef": "Vishal", // Vishal ka API Key
};

// Middleware to check API key
function checkLeadAuth(req, res, next) {
  const authHeader = req.headers["x-api-key"];

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header is missing." });
  }

  const partner = partnerApiKeys[authHeader];

  if (!partner) {
    return res.status(403).json({ error: "Unauthorized API key." });
  }

  req.partner = partner; // Set partner name in request object
  next();
}

module.exports = { checkLeadAuth };
