const alumno = require("./js/Alumnos");

module.exports = async (srv) => {
    //ALUMNOS
     srv.before("CREATE", "Alumnos", alumno.createAlumnoBefore)
};