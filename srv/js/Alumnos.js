const cds = require('@sap/cds');
const commons = require("../helpers/commons");
const validation = require("../helpers/validations");


const createAlumnoBefore = async (req) => {
    const tx = cds.transaction(req);

    // Validamos todos los campos obligatorios
    validation.validationRequiredFields(req, ["dni", "nombre", "apellido"]);

    // Normalizamos el DNI
    let { dni } = req.data;
    dni = commons.normalizeDni(dni);
    req.data.dni = dni;

    // Verificamos existencia
    const exists = await tx.run(
        cds.ql.SELECT.one.from(req.target).columns("ID").where({ dni })
    );

    if (exists) {
        return req.reject(409, `Ya existe un alumno con el DNI ${dni}.`, {
        target: "dni",
        code: "DNI_EXISTS",
        });
    }
}



module.exports = {
    
    createAlumnoBefore

};