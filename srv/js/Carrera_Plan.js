const cds = require('@sap/cds');
const commons = require("../helpers/commons");
const validation = require("../helpers/validations");




/**
 * CREATE PlanCarrera:
 * - Requeridos: carrera_ID, anioVigencia, duracionAnios
 * - Carrera existe
 * - Rangos: anioVigencia [2000..año_actual+1], duracionAnios [1..10]
 * - Unicidad lógica: (carrera_ID, anioVigencia) no debe repetirse
 * - Estado: si no viene, default 'Borrador' (el enum valida el resto)
 */
const createPlanCarreraBefore = async (req) => {
  const tx = cds.transaction(req);

  validation.validationRequiredFields(req, ['carrera_ID', 'anioVigencia', 'duracionAnios']);

  const { carrera_ID, anioVigencia, duracionAnios } = req.data;

  // Carrera existe
  const carrera = await tx.run(
    cds.ql.SELECT.one.from('Carrera').columns('ID').where({ ID: carrera_ID })
  );
  if (!carrera) {
    return req.reject(404, 'Carrera no encontrada.', { target: 'carrera_ID', code: 'CARRERA_NOT_FOUND' });
  }

  // Rangos
  const year = new Date().getFullYear();
  if (typeof anioVigencia !== 'number' || anioVigencia < 2000 || anioVigencia > year + 1) {
    return req.reject(400, `anioVigencia debe estar entre 2000 y ${year + 1}.`, { target: 'anioVigencia' });
  }
  if (typeof duracionAnios !== 'number' || duracionAnios < 1 || duracionAnios > 10) {
    return req.reject(400, 'duracionAnios debe estar entre 1 y 10.', { target: 'duracionAnios' });
  }

  // Unicidad por carrera + año
  const dup = await tx.run(
    cds.ql.SELECT.one.from('PlanCarrera').columns('ID').where({ carrera_ID, anioVigencia })
  );
  if (dup) {
    return req.reject(409, 'Ya existe un plan para esa carrera y año de vigencia.', {
      code: 'PLAN_DUPLICATE_YEAR'
    });
  }

  // Default de estado si no viene
  if (!req.data.estado) req.data.estado = 'Borrador';
};

/**
 * UPDATE PlanCarrera:
 * - No permitir cambiar carrera_ID
 * - Validar rangos si cambian anioVigencia / duracionAnios
 * - Mantener unicidad (carrera_ID, anioVigencia) si se cambia anioVigencia
 */
const updatePlanCarreraBefore = async (req) => {
  const tx = cds.transaction(req);

  const id = req.data?.ID ?? req.params?.[0]?.ID;
  if (!id) return req.reject(400, 'Falta ID de PlanCarrera.');

  const current = await tx.run(
    cds.ql.SELECT.one.from('PlanCarrera')
      .columns('ID', 'carrera_ID', 'anioVigencia', 'duracionAnios', 'estado')
      .where({ ID: id })
  );
  if (!current) return req.reject(404, 'PlanCarrera no encontrado.');

  // No permitir cambiar carrera_ID
  if ('carrera_ID' in req.data && req.data.carrera_ID !== current.carrera_ID) {
    return req.reject(400, 'No se permite cambiar la carrera del plan.', { target: 'carrera_ID' });
  }

  // Validar rangos si vienen
  const year = new Date().getFullYear();
  if ('anioVigencia' in req.data) {
    const av = req.data.anioVigencia;
    if (typeof av !== 'number' || av < 2000 || av > year + 1) {
      return req.reject(400, `anioVigencia debe estar entre 2000 y ${year + 1}.`, { target: 'anioVigencia' });
    }
    // Unicidad si cambia el año
    if (av !== current.anioVigencia) {
      const dup = await tx.run(
        cds.ql.SELECT.one.from('PlanCarrera').columns('ID')
          .where({ carrera_ID: current.carrera_ID, anioVigencia: av })
      );
      if (dup) {
        return req.reject(409, 'Ya existe un plan para esa carrera y año de vigencia.', {
          code: 'PLAN_DUPLICATE_YEAR'
        });
      }
    }
  }
  if ('duracionAnios' in req.data) {
    const da = req.data.duracionAnios;
    if (typeof da !== 'number' || da < 1 || da > 10) {
      return req.reject(400, 'duracionAnios debe estar entre 1 y 10.', { target: 'duracionAnios' });
    }
  }
  // 'estado' lo valida el enum del modelo (Vigente/Antiguo/Borrador)
};

/**
 * DELETE PlanCarrera:
 * - Permitir sólo si está en Borrador
 * - (Recomendado) Bloquear si tiene PlanMaterias asociados
 */
const deletePlanCarreraBefore = async (req) => {
  const tx = cds.transaction(req);

  const id = req.data?.ID ?? req.params?.[0]?.ID;
  if (!id) return req.reject(400, 'Falta ID de PlanCarrera.');

  const plan = await tx.run(
    cds.ql.SELECT.one.from('PlanCarrera').columns('estado').where({ ID: id })
  );
  if (!plan) return req.reject(404, 'PlanCarrera no encontrado.');

  if (plan.estado !== 'Borrador') {
    return req.reject(400, `No se puede eliminar un plan en estado ${plan.estado}.`);
  }

  // Si querés ser estricto: no borrar si tiene materias (aunque la composición podría cascada)
  const hasPM = await tx.run(
    cds.ql.SELECT.one.from('PlanMateria').columns('ID').where({ plan_ID: id })
  );
  if (hasPM) {
    return req.reject(400, 'No se puede eliminar: el plan tiene materias asociadas.', {
      code: 'PLAN_HAS_CHILDREN'
    });
  }
};





/**
 * CREATE PlanMateria:
 * - Campos obligatorios: plan_ID, materia_ID, anio, semestre
 * - Plan existe y está en Borrador
 * - Materia existe
 * - anio en [1..duracionAnios del plan]
 * - semestre ∈ {S1,S2}
 * - No duplicar (plan_ID, materia_ID)
 * - estado por defecto 'Activa'
 */
const createPlanMateriaBefore = async (req) => {
  const tx = cds.transaction(req);

  // 1) Requeridos
  validation.validationRequiredFields(req, ["plan_ID", "materia_ID", "anio", "semestre"]);

  const { plan_ID, materia_ID, anio, semestre } = req.data;

  // Plan debe existir y estar en Borrador
  const plan = await tx.run(
    SELECT.one.from("PlanCarrera").columns("ID", "duracionAnios", "estado").where({ ID: plan_ID })
  );
  if (!plan) {
    return req.reject(404, "Plan no encontrado.", {
      target: "plan_ID",
      code: "PLAN_NOT_FOUND",
    });
  }
  if (plan.estado !== "Borrador") {
    return req.reject(400, `No se puede modificar un plan en estado ${plan.estado}.`, {
      target: "plan_ID",
      code: "PLAN_NOT_EDITABLE",
    });
  }

  // Materia debe existir
  const mat = await tx.run(SELECT.one.from("Materia").columns("ID").where({ ID: materia_ID }));
  if (!mat) {
    return req.reject(404, "Materia no encontrada.", {
      target: "materia_ID",
      code: "MATERIA_NOT_FOUND",
    });
  }

  // Rango de año
  if (typeof anio !== "number" || anio < 1 || anio > plan.duracionAnios) {
    return req.reject(400, `El año debe estar entre 1 y ${plan.duracionAnios}.`, {
      target: "anio",
      code: "YEAR_OUT_OF_RANGE",
    });
  }

  // Semestre válido
  if (!["S1", "S2"].includes(semestre)) {
    return req.reject(400, "Semestre inválido. Use 'S1' o 'S2'.", {
      target: "semestre",
      code: "SEMESTER_INVALID",
    });
  }

  // Evitar duplicado plan + materia
  const dup = await tx.run(
    SELECT.one.from("PlanMateria").columns("ID").where({ plan_ID, materia_ID })
  );
  if (dup) {
    return req.reject(409, "La materia ya está incluida en este plan.", {
      target: "materia_ID",
      code: "DUPLICATED_PLAN_MATERIA",
    });
  }

};

const updatePlanMateriaBefore = async (req) => {
  const tx = cds.transaction(req);

  // 1) Obtener ID de la fila a actualizar (de body o de la URL)
  const id = req.data?.ID ?? req.params?.[0]?.ID;
  if (!id) {
    return req.reject(400, 'Falta ID de PlanMateria.');
  }

  // 2) Traer fila actual
  const current = await tx.run(
    cds.ql.SELECT.one.from('PlanMateria')
      .columns('ID', 'plan_ID', 'materia_ID')
      .where({ ID: id })
  );
  if (!current) {
    return req.reject(404, 'PlanMateria no encontrado.');
  }

  // 3) El plan del registro debe estar en Borrador
  const plan = await tx.run(
    cds.ql.SELECT.one.from('PlanCarrera')
      .columns('ID', 'estado', 'duracionAnios')
      .where({ ID: current.plan_ID })
  );
  if (!plan) return req.reject(404, 'Plan no encontrado.');
  if (plan.estado !== 'Borrador') {
    return req.reject(400, `No se puede modificar un plan en estado ${plan.estado}.`, { code: 'PLAN_NOT_EDITABLE' });
  }

  // Semestre válido
  let semestre = req.data?.semestre
  if (!["S1", "S2"].includes(semestre)) {
    return req.reject(400, "Semestre inválido. Use 'S1' o 'S2'.", {
      target: "semestre",
      code: "SEMESTER_INVALID",
    });
  }

  // 4) No permitir cambiar plan_ID ni materia_ID (si vienen y difieren)
  if ('plan_ID' in req.data && req.data.plan_ID !== current.plan_ID) {
    return req.reject(400, 'No se permite cambiar el plan. Eliminá y volvé a crear.', { target: 'plan_ID' });
  }
  if ('materia_ID' in req.data && req.data.materia_ID !== current.materia_ID) {
    return req.reject(400, 'No se permite cambiar la materia. Eliminá y volvé a crear.', { target: 'materia_ID' });
  }

  // 5) Solo campos editables (permitimos que PUT envíe plan_ID/materia_ID/ID si son iguales)
  const allowed = new Set(['anio', 'semestre', 'estado', 'plan_ID', 'materia_ID', 'ID']);
  for (const k of Object.keys(req.data)) {
    if (!allowed.has(k)) {
      return req.reject(400, `Campo no editable en UPDATE: ${k}`);
    }
  }



  // 6) Validaciones de negocio en los campos cambiados
  if ('anio' in req.data) {
    const a = req.data.anio;
    if (typeof a !== 'number' || a < 1 || a > plan.duracionAnios) {
      return req.reject(400, `El año debe estar entre 1 y ${plan.duracionAnios}.`, { target: 'anio', code: 'YEAR_OUT_OF_RANGE' });
    }
  }

};




const deletePlanMateriaBefore = async (req) => {
  const tx = cds.transaction(req);

  const id = req.data?.ID ?? req.params?.[0]?.ID;
  if (!id) return req.reject(400, 'Falta ID de PlanMateria.');

  const row = await tx.run(
    cds.ql.SELECT.one.from('PlanMateria').columns('plan_ID').where({ ID: id })
  );
  if (!row) return req.reject(404, 'PlanMateria no encontrado.');

  const plan = await tx.run(
    cds.ql.SELECT.one.from('PlanCarrera').columns('estado').where({ ID: row.plan_ID })
  );
  if (!plan) return req.reject(404, 'Plan no encontrado.');

  if (plan.estado !== 'Borrador') {
    return req.reject(400, `No se puede eliminar porque el plan está en estado ${plan.estado}.`);
  }

};



/**
 * CREATE Materia
 * - Requerido: nombre
 * - Normaliza nombre: trim + colapsa espacios
 * - Longitud: 1..100
 * - Unicidad simple por nombre (exacta)
 */
const createMateriaBefore = async (req) => {
  const tx = cds.transaction(req);

  if (req.data.nombre === undefined || req.data.nombre === null) {
    return req.reject(400, 'El campo "nombre" es obligatorio.', { target: 'nombre' });
  }

  let nombre = String(req.data.nombre).trim().replace(/\s+/g, ' ');
  if (nombre.length === 0) {
    return req.reject(400, 'El campo "nombre" no puede quedar vacío.', { target: 'nombre' });
  }
  if (nombre.length > 100) {
    return req.reject(400, 'El "nombre" no puede superar 100 caracteres.', { target: 'nombre' });
  }

  // Unicidad simple (exacta); si querés case-insensitive, después te muestro cómo hacerlo
  const dup = await tx.run(
    cds.ql.SELECT.one.from('Materia').columns('ID').where({ nombre })
  );
  if (dup) {
    return req.reject(409, 'Ya existe una materia con ese nombre.', { target: 'nombre', code: 'MATERIA_DUPLICATE' });
  }

  // Persistimos normalizado
  req.data.nombre = nombre;
};

/**
 * UPDATE Materia
 * - No permitir cambiar ID (lo maneja OData key)
 * - Si viene "nombre": mismas validaciones que CREATE
 * - Unicidad por nombre (excluyendo el propio ID)
 */
const updateMateriaBefore = async (req) => {
  const tx = cds.transaction(req);

  const id = req.data?.ID ?? req.params?.[0]?.ID;
  if (!id) return req.reject(400, 'Falta ID de Materia.');

  const current = await tx.run(
    cds.ql.SELECT.one.from('Materia').columns('ID', 'nombre').where({ ID: id })
  );
  if (!current) return req.reject(404, 'Materia no encontrada.');

  if ('nombre' in req.data) {
    let nombre = String(req.data.nombre).trim().replace(/\s+/g, ' ');
    if (nombre.length === 0) {
      return req.reject(400, 'El campo "nombre" no puede quedar vacío.', { target: 'nombre' });
    }
    if (nombre.length > 100) {
      return req.reject(400, 'El "nombre" no puede superar 100 caracteres.', { target: 'nombre' });
    }

    // Duplicado (excluyendo el propio ID)
    const dup = await tx.run(
      cds.ql.SELECT.one.from('Materia').columns('ID').where({ nombre })
    );
    if (dup && dup.ID !== id) {
      return req.reject(409, 'Ya existe una materia con ese nombre.', { target: 'nombre', code: 'MATERIA_DUPLICATE' });
    }

    req.data.nombre = nombre;
  }
};

/**
 * DELETE Materia
 * - Bloquear si está referenciada por algún PlanMateria
 */
const deleteMateriaBefore = async (req) => {
  const tx = cds.transaction(req);

  const id = req.data?.ID ?? req.params?.[0]?.ID;
  if (!id) return req.reject(400, 'Falta ID de Materia.');

  const exists = await tx.run(
    cds.ql.SELECT.one.from('Materia').columns('ID').where({ ID: id })
  );
  if (!exists) return req.reject(404, 'Materia no encontrada.');

  const used = await tx.run(
    cds.ql.SELECT.one.from('PlanMateria').columns('ID').where({ materia_ID: id })
  );
  if (used) {
    return req.reject(400, 'No se puede eliminar: la materia está utilizada en al menos un plan.', {
      code: 'MATERIA_IN_USE'
    });
  }
};



module.exports = {
  createPlanCarreraBefore,
  updatePlanCarreraBefore,
  deletePlanCarreraBefore,

  createPlanMateriaBefore,
  updatePlanMateriaBefore,
  deletePlanMateriaBefore,

  createMateriaBefore,
  updateMateriaBefore,
  deleteMateriaBefore,
};