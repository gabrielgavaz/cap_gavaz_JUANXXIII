namespace academic;

entity Alumno {
  key ID: UUID;
  dni: String(20) ;
  nombre: String;
  apellido: String;
  email: String ;
  inscripciones: Composition of many Inscripcion on inscripciones.alumno = $self;
}

entity Profesor {
  key ID: UUID;
  legajo: String(20);
  nombre: String;
  apellido: String;
  email: String;
  materias: Association to many Materia on materias.profesor = $self;
}

entity Materia {
  key ID: UUID;
  nombre: String(100);
  anio: Integer;
  profesor: Association to Profesor;
}

entity Edificio {
  key ID: UUID;
  nombre: String(50);
  descripcion: String(100);
}

entity Aula {
  key ID: UUID;
  nombre: String(50);
  ubicacion: String(100);
  capacidad: Integer;
  edificio: Association to Edificio;
}

entity Inscripcion {
  key ID      : UUID;
  alumno      : Association to Alumno;
  materia     : Association to Materia;
  aula        : Association to Aula;

  notaFinal   : Integer;             
  estado      : String enum { Cursando; Aprobado; Reprobado; };

  evaluaciones: Composition of many Evaluacion on evaluaciones.inscripcion = $self;
}

entity Evaluacion {
  key ID        : UUID;
  inscripcion   : Association to Inscripcion;
  tipo          : String enum { Parcial1; Parcial2; Recuperatorio; };
  nota          : Integer;           // 1..10
  fecha         : Date;
}