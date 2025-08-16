const cds = require('@sap/cds');

const normalizeDni = (value) => {
    return value ? String(value).replace(/[.\-\s]/g, "").trim() : value;
}
const fechaActual = (value) => {
    return new Date().toISOString();
}

module.exports = {
    normalizeDni,
    fechaActual
};