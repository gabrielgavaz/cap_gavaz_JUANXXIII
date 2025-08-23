const cds = require('@sap/cds');
const commons = require("../helpers/commons");
const validation = require("../helpers/validations");


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

  // Default estado
  if (!req.data.estado) req.data.estado = "Activa";
};

module.exports = {
  createPlanMateriaBefore,
};