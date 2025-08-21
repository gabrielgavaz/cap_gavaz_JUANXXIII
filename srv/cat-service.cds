using academic as db from '../db/schema';

service AcademicService {
    entity Alumnos      as projection on db.Alumno;
    entity Profesores   as projection on db.Profesor;
    entity Materias     as projection on db.Materia;
    entity Edificios    as projection on db.Edificio;
    entity Aulas        as projection on db.Aula;
    entity PlanCarreras as projection on db.PlanCarrera;
    entity Carreras     as projection on db.Carrera;


//Actions
// action ping() returns String;
}
