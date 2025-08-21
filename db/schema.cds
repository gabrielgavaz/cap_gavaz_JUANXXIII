// =======================================================
//  Academic Domain Model
//  Descripción:
//   - Carreras con Planes de Estudio (versionables)
//   - Materias ubicadas por año/semestre dentro de un Plan
//   - Ofertas de cursada (Comisiones) por período/profesor/aula
//   - Inscripciones del Alumno a Comisiones, con Evaluaciones
// =======================================================

namespace academic;

using {managed} from '@sap/cds/common';


// -------------------------------------------------------
// Tipos y enums
// -------------------------------------------------------
type Semestre : String enum {
  S1;
  S2
};


// -------------------------------------------------------
// Catálogo Académico: Carrera y Plan
// -------------------------------------------------------
entity Carrera {
  key ID     : UUID;
      codigo : String(10); // p.ej. T-INF, LIC-SOFT
      nombre : String(120); // p.ej. Tecnicatura en Informática
      tipo   : String enum {
        Tecnicatura;
        Grado
      };
}

entity PlanCarrera {
  key ID            : UUID;
      carrera       : Association to Carrera;
      anioVigencia  : Integer; // p.ej. 2023
      duracionAnios : Integer; // p.ej. 3, 5
      estado        : String enum {
        Vigente;
        Antiguo
      };
}

// Materia está asociada a un Plan.
entity Materia {
  key ID     : UUID;
      nombre : String(100);

}

/** Tabla puente: Materias incluidas en un Plan */
entity PlanMateria {
  key ID       : UUID;
      plan     : Association to PlanCarrera;
      materia  : Association to Materia;

      // Atributos que dependen del plan
      anio     : Integer;
      semestre : Semestre;

      // Útil para reglas (optativo)
      estado   : String enum {
        Activa;
        Optativa;
        Inactiva
      } default 'Activa';
}


// -------------------------------------------------------
// Personas
// -------------------------------------------------------
entity Profesor {
  key ID         : UUID;
      legajo     : String(20);
      nombre     : String(80);
      apellido   : String(80);
      email      : String(120);

      // Navegación a Comisiones dictadas por el profesor
      comisiones : Association to many Comision
                     on comisiones.profesor = $self;
}

entity Alumno : managed {
  key ID            : UUID;
      dni           : String(20);
      nombre        : String(80);
      apellido      : String(80);
      email         : String(120);

      // Plan de carrera al que está inscripto el alumno 
      plan          : Association to PlanCarrera;

      // Relación de composición
      inscripciones : Composition of many Inscripcion
                        on inscripciones.alumno = $self;
}


// -------------------------------------------------------
// Infraestructura (Campus)
// -------------------------------------------------------
entity Edificio {
  key ID          : UUID;
      nombre      : String(50);
      descripcion : String(100);
}

entity Aula {
  key ID        : UUID;
      nombre    : String(50);
      ubicacion : String(100);
      capacidad : Integer;
      edificio  : Association to Edificio;
}


// -------------------------------------------------------
// Períodos lectivos y Oferta de cursada (Comisiones)
// -------------------------------------------------------
entity PeriodoLectivo {
  key ID       : UUID;
      anio     : Integer; // p.ej. 2025
      semestre : Semestre; // S1 / S2
}

// Comision = sección/oferta concreta de una Materia en un período,
// con su Profesor y Aula (y cupo opcional).
entity Comision {
  key ID       : UUID;
      materia  : Association to Materia;
      periodo  : Association to PeriodoLectivo;
      profesor : Association to Profesor;
      aula     : Association to Aula;
      cupo     : Integer; // opcional: capacidad específica
}


// -------------------------------------------------------
// Cursada y Evaluación
// -------------------------------------------------------
entity Inscripcion : managed {
  key ID           : UUID;

      // Alumno inscripto a una oferta concreta (Comision)
      alumno       : Association to Alumno;
      comision     : Association to Comision;

      // Estado académico de la inscripción
      notaFinal    : Integer; // calculada a partir de Evaluaciones (opcional)
      estado       : String enum {
        Cursando;
        Aprobado;
        Reprobado
      } default 'Cursando';

      // Evaluaciones (Parcial1, Parcial2, Recuperatorio)
      evaluaciones : Composition of many Evaluacion
                       on evaluaciones.inscripcion = $self;
}

entity Evaluacion : managed {
  key ID          : UUID;
      inscripcion : Association to Inscripcion;
      tipo        : String enum {
        Parcial1;
        Parcial2;
        Recuperatorio
      };
      nota        : Integer; // 1..10
      fecha       : Date;
}


// -------------------------------------------------------
// Recomendaciones de persistencia (índices)
//  - Unicidad: un Alumno no puede inscribirse dos veces
//    a la misma Comision.
// -------------------------------------------------------
// annotate academic.Inscripcion with @cds.persistence.indexes: [
//   { name: 'uniq_alumno_comision', unique: true, columns: ['alumno_ID','comision_ID'] }
// ];
