const cds = require('@sap/cds');
const commons = require("../helpers/commons");
const validation = require("../helpers/validations");
const { data } = require('@sap/cds/lib/dbs/cds-deploy');


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
      .columns('ID','plan_ID','materia_ID')
      .where({ ID: id })
  );
  if (!current) {
    return req.reject(404, 'PlanMateria no encontrado.');
  }

  // 3) El plan del registro debe estar en Borrador
  const plan = await tx.run(
    cds.ql.SELECT.one.from('PlanCarrera')
      .columns('ID','estado','duracionAnios')
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
  const allowed = new Set(['anio','semestre','estado','plan_ID','materia_ID','ID']);
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
module.exports = {
  createPlanMateriaBefore,
  updatePlanMateriaBefore,
  deletePlanMateriaBefore
};