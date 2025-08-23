const alumno = require("./js/Alumnos");
const profesor = require("./js/Profesores");
const planMateria = require("./js/Carrera_Plan");
const jobs = require("./jobs/Jobs");

module.exports = async (srv) => {
    //ALUMNOS
    srv.before("CREATE", "Alumnos", alumno.createAlumnoBefore)

    //PROFESORES
    // srv.before("CREATE", "Profesores", profesor.createProfesorBefore)


    // PLAN MATERIAS
    // srv.before("READ", "PlanMaterias", planMateria.readPlanMateriasBefore);   
    srv.before("CREATE", "PlanMaterias", planMateria.createPlanMateriaBefore); 
    srv.before("UPDATE", "PlanMaterias", planMateria.updatePlanMateriaBefore); 
    srv.before('DELETE', 'PlanMaterias', planMateria.deletePlanMateriaBefore);





    srv.on("ping", jobs.testJob)
};