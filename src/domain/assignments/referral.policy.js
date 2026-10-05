const { SPECIALTIES, PRIORITIES } = require('../common');
const {
  ValidationError,
  AuthorizationError,
  ConflictError,
} = require('../../shared/errors/AppError');

function validateQualification(input) {
  if (
    !input ||
    !SPECIALTIES.includes(input.specialty) ||
    !PRIORITIES.includes(input.priority)
  ) {
    throw new ValidationError(
      'Selecciona una especialidad y una prioridad válidas'
    );
  }
  const treatment =
    typeof input.treatment === 'string' ? input.treatment.trim() : '';
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (
    treatment.length < 3 ||
    treatment.length > 500 ||
    reason.length < 5 ||
    reason.length > 2000
  ) {
    throw new ValidationError(
      'Indica el tratamiento (3 a 500 caracteres) y el motivo (5 a 2000 caracteres)'
    );
  }
  return {
    specialty: input.specialty,
    priority: input.priority,
    treatment,
    reason,
  };
}

function canRefer(assignment, user) {
  if (
    user.role === 'student' &&
    assignment.codigo_estudiante !== user.codigo_estudiante
  ) {
    throw new AuthorizationError('Solo puedes derivar tus pacientes asignados');
  }
  if (!['contactado', 'en_tratamiento'].includes(assignment.estado)) {
    throw new ConflictError(
      'Primero contacta y revisa el caso; solo puedes derivarlo antes de cerrarlo'
    );
  }
}

module.exports = { validateQualification, canRefer };
