const {
  ASSIGNMENT_STATES,
  TRANSITIONS,
  ACTIVE_ASSIGNMENT_STATES,
} = require('../common');

const CONTACT_OUTCOMES = ['sin_respuesta', 'contactado', 'acepta', 'pide_reprogramar', 'rechaza'];

function validDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateFollowUp(value) {
  if (!CONTACT_OUTCOMES.includes(value?.resultado)) return null;
  const { resultado, motivo = '', proxima_fecha = null, fecha_acordada = null } = value;
  if (typeof motivo !== 'string' || motivo.trim().length > 2000 ||
      (['pide_reprogramar', 'rechaza'].includes(resultado) && motivo.trim().length < 5) ||
      (proxima_fecha !== null && !validDate(proxima_fecha)) ||
      (fecha_acordada !== null && (!validDate(fecha_acordada) ||
        ['sin_respuesta', 'rechaza'].includes(resultado)))) return null;
  return { resultado, motivo: motivo.trim(), proxima_fecha, fecha_acordada };
}

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

  let followUp;
  let nextState = input.estado || assignment.estado;
  if (input.seguimiento !== undefined) {
    followUp = validateFollowUp(input.seguimiento);
    if (!followUp)
      return { ok: false, code: 'VALIDATION', message: 'Revisa el resultado, el motivo y las fechas del seguimiento' };
    if (!['asignado', 'notificado', 'contactado', 'en_tratamiento'].includes(assignment.estado) ||
        ['cancelado', 'completado'].includes(nextState))
      return { ok: false, code: 'CONFLICT', message: 'Registra el seguimiento desde una asignación activa' };
    if (followUp.resultado !== 'sin_respuesta' && ['asignado', 'notificado'].includes(nextState))
      nextState = 'contactado';
    if (followUp.resultado === 'sin_respuesta' && assignment.estado !== 'contactado' && nextState === 'contactado')
      return { ok: false, code: 'VALIDATION', message: 'El estado Contactado requiere que el paciente haya respondido' };
  }
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
    !input.observaciones_estudiante?.trim() && !followUp
  ) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'No hay cambios para guardar',
    };
  }

  const cancellationReason =
    typeof input.motivo_cancelacion === 'string' ? input.motivo_cancelacion.trim() : '';
  if (nextState === 'cancelado' && nextState !== assignment.estado &&
      (cancellationReason.length < 5 || cancellationReason.length > 2000)) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'Indica el motivo de cancelación (5 a 2000 caracteres)',
    };
  }

  return {
    ok: true,
    cancellationReason,
    followUp,
    nextState,
    isActive: ACTIVE_ASSIGNMENT_STATES.includes(nextState),
    observation:
      input.observaciones_estudiante === undefined
        ? undefined
        : String(input.observaciones_estudiante).slice(0, 2000),
  };
}

module.exports = { decideUpdate };
