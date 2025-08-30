const alumno = require("./js/Alumnos");
const profesor = require("./js/Profesores");
const planMateria = require("./js/Carrera_Plan");
const jobs = require("./jobs/Jobs");

module.exports = async (srv) => {
    //ALUMNOS
    srv.before("CREATE", "Alumnos", alumno.createAlumnoBefore)

    //PROFESORES
    // srv.before("CREATE", "Profesores", profesor.createProfesorBefore)


    srv.before('CREATE', 'Carreras', planMateria.createCarreraBefore);
    srv.before('UPDATE', 'Carreras', planMateria.updateCarreraBefore);
    srv.before('DELETE', 'Carreras', planMateria.deleteCarreraBefore);

    srv.before('CREATE', 'PlanCarreras', planMateria.createPlanCarreraBefore);
    srv.before('UPDATE', 'PlanCarreras', planMateria.updatePlanCarreraBefore);
    srv.before('DELETE', 'PlanCarreras', planMateria.deletePlanCarreraBefore);

    // PLAN MATERIAS
    // srv.before("READ", "PlanMaterias", planMateria.readPlanMateriasBefore);   
    srv.before("CREATE", "PlanMaterias", planMateria.createPlanMateriaBefore); 
    srv.before("UPDATE", "PlanMaterias", planMateria.updatePlanMateriaBefore); 
    srv.before('DELETE', 'PlanMaterias', planMateria.deletePlanMateriaBefore);

    srv.before('CREATE', 'Materias', planMateria.createMateriaBefore);
    srv.before('UPDATE', 'Materias', planMateria.updateMateriaBefore);
    srv.before('DELETE', 'Materias', planMateria.deleteMateriaBefore);



    srv.on("ping", jobs.testJob)
};