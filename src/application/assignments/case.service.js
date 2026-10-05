const {
  validateQualification,
} = require('../../domain/assignments/referral.policy');
const { ValidationError } = require('../../shared/errors/AppError');

function numericId(id) {
  if (!Number.isSafeInteger(Number(id)) || Number(id) < 1)
    throw new ValidationError('ID inválido');
  return Number(id);
}

class CaseService {
  constructor(repository, matching) {
    this.repository = repository;
    this.matching = matching;
  }
  detail(id, user, byAssignment) {
    return this.repository.detail(numericId(id), user, byAssignment);
  }
  qualify(id, input, user) {
    return this.repository.qualify(
      numericId(id),
      validateQualification(input),
      user
    );
  }
  propose(id, input, user) {
    return this.repository.propose(
      numericId(id),
      validateQualification(input),
      user
    );
  }
  listReferrals() {
    return this.repository.listReferrals();
  }

  async review(id, input, user) {
    if (!['aprobada', 'rechazada'].includes(input.estado))
      throw new ValidationError('Decisión inválida');
    const reason = String(input.motivo_revision || '').trim();
    if (reason.length < 5 || reason.length > 2000)
      throw new ValidationError(
        'Indica el motivo de la revisión (5 a 2000 caracteres)'
      );
    const qualification =
      input.estado === 'aprobada' ? validateQualification(input) : null;
    const result = await this.repository.review(
      numericId(id),
      input.estado,
      qualification,
      reason,
      user
    );
    if (input.estado === 'aprobada') {
      try {
        result.matching = await this.matching.matchPatient(result.id_paciente);
      } catch {
        result.matching = {
          success: false,
          reason: 'Paciente pendiente; vuelve a ejecutar matching',
        };
      }
    }
    return result;
  }
}

module.exports = { CaseService, numericId };
