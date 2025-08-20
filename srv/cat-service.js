const alumno = require("./js/Alumnos");
const profesor = require("./js/Profesores");
const jobs = require("./jobs/Jobs");

module.exports = async (srv) => {
    //ALUMNOS
    srv.before("CREATE", "Alumnos", alumno.createAlumnoBefore)

    //PROFESORES
    // srv.before("CREATE", "Profesores", profesor.createProfesorBefore)


    srv.on("ping", jobs.testJob)
};