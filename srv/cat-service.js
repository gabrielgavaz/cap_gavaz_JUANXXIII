const alumno = require("./js/Alumnos");
const jobs = require("./jobs/Jobs");

module.exports = async (srv) => {
    //ALUMNOS
     srv.before("CREATE", "Alumnos", alumno.createAlumnoBefore)


     srv.on("ping", jobs.testJob)
};