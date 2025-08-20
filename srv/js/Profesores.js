const cds = require('@sap/cds');
const commons = require("../helpers/commons");
const validation = require("../helpers/validations");


const createAlumnoBefore = async (req) => {
    const tx = cds.transaction(req);

    // Validamos todos los campos obligatorios
    validation.validationRequiredFields(req, ["legajo", "nombre", "apellido","email"]);

    // Normalizamos el DNI
    let { legajo } = req.data;
    legajo = commons.normalizeDni(legajo);
    req.data.legajo = legajo;

    // Verificamos existencia
    const exists = await tx.run(
        cds.ql.SELECT.one.from(req.target).columns("ID").where({ legajo })
    );

    if (exists) {
        return req.reject(409, `Ya existe un Profesor con el Legajo ${legajo}.`, {
        target: "legajo",
        code: "LEGAJO_EXISTS",
        });
    }
}



module.exports = {
    
    createAlumnoBefore

};