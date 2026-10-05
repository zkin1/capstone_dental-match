const {
  ASSIGNMENT_STATES,
  TRANSITIONS,
  ACTIVE_ASSIGNMENT_STATES,
} = require('../common');

function decideUpdate(assignment, input, user) {
  if (!assignment)
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Asignación no encontrada',
    };
  if (
    user.role === 'student' &&
    assignment.codigo_estudiante !== user.codigo_estudiante
  ) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Solo puedes actualizar tus propias asignaciones',
    };
  }
  if (
    input.observaciones_estudiante !== undefined &&
    (typeof input.observaciones_estudiante !== 'string' ||
      input.observaciones_estudiante.length > 2000)
  ) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'La nota debe ser texto de hasta 2000 caracteres',
    };
  }

  const nextState = input.estado || assignment.estado;
  if (!ASSIGNMENT_STATES.includes(nextState)) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Estado de asignación no válido',
    };
  }
  if (
    nextState !== assignment.estado &&
    !TRANSITIONS[assignment.estado]?.includes(nextState)
  ) {
    return {
      ok: false,
      code: 'CONFLICT',
      message: `No se puede pasar de ${assignment.estado} a ${nextState}`,
    };
  }
  if (
    nextState === assignment.estado &&
    !input.observaciones_estudiante?.trim()
  ) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'No hay cambios para guardar',
    };
  }

  return {
    ok: true,
    nextState,
    isActive: ACTIVE_ASSIGNMENT_STATES.includes(nextState),
    observation:
      input.observaciones_estudiante === undefined
        ? undefined
        : String(input.observaciones_estudiante).slice(0, 2000),
  };
}

module.exports = { decideUpdate };
