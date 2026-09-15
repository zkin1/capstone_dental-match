const { ASSIGNMENT_STATES, TRANSITIONS, ACTIVE_ASSIGNMENT_STATES } = require('../common');

function decideUpdate(assignment, input, user) {
  if (!assignment) return { ok: false, code: 'NOT_FOUND', message: 'Asignación no encontrada' };
  if (user.role === 'student' && assignment.codigo_estudiante !== user.codigo_estudiante) {
    return { ok: false, code: 'FORBIDDEN', message: 'Solo puedes actualizar tus propias asignaciones' };
  }

  const nextState = input.estado || assignment.estado;
  if (!ASSIGNMENT_STATES.includes(nextState)) {
    return { ok: false, code: 'VALIDATION', message: 'Estado de asignación no válido' };
  }
  if (nextState !== assignment.estado && !TRANSITIONS[assignment.estado]?.includes(nextState)) {
    return {
      ok: false,
      code: 'CONFLICT',
      message: `No se puede pasar de ${assignment.estado} a ${nextState}`,
    };
  }
  if (nextState === assignment.estado && input.observaciones_estudiante === undefined) {
    return { ok: false, code: 'VALIDATION', message: 'No hay cambios para guardar' };
  }

  return {
    ok: true,
    nextState,
    isActive: ACTIVE_ASSIGNMENT_STATES.includes(nextState),
    observation: input.observaciones_estudiante === undefined
      ? undefined
      : String(input.observaciones_estudiante).slice(0, 2000),
  };
}

module.exports = { decideUpdate };
