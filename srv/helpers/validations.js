const cds = require('@sap/cds');

const validationRequiredFields = (req, requiredFields) =>{
  const missing = [];

  for (const field of requiredFields) {
    const value = req.data[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    const msg = `Faltan los siguientes campos obligatorios: ${missing.join(", ")}`;
    req.reject(400, msg, { target: missing[0], code: "MISSING_FIELDS" });
  }
}
module.exports = {
    validationRequiredFields
};