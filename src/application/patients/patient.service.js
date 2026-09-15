const { ValidationError, NotFoundError } = require('../../shared/errors/AppError');
const { validateIntake, validateCreate, validateUpdate } = require('../../domain/patients/patient.validation');

class PatientService {
  constructor({ repository, matching, triage }) {
    this.repository = repository;
    this.matching = matching;
    this.triage = triage;
  }

  async intake(input) {
    const validation = validateIntake(input);
    if (validation.error) throw new ValidationError(validation.error);
    const preCategory = await this.triage.preCategorizar(validation.answers) || validation.answers;
    const id = await this.repository.createFromIntake(validation.value, validation.answers, preCategory);

    let assignment;
    try {
      assignment = await this.matching.matchPatient(id);
    } catch (error) {
      console.error(`Matching falló para el caso ${id}:`, error.message);
      assignment = { success: false, reason: 'El caso quedó pendiente para el próximo matching' };
    }
    const category = assignment.category || this.matching.scorePatientCategory({
      ...validation.value,
      pre_categorizacion_ia: preCategory,
      prioridad: 'Moderada',
    });

    return {
      message: assignment.success ? 'Caso registrado y asignado' : 'Caso registrado y pendiente de asignación',
      data: {
        id,
        numeroCaso: `CASO-${String(id).padStart(6, '0')}`,
        preCategorizacion: preCategory,
        categoria: category,
        alertaClinica: category.redFlag
          ? 'Los signos informados requieren evaluación odontológica urgente. Si empeoran, acude a un servicio de urgencia.'
          : null,
        estudianteAsignado: assignment.success ? {
          nombre: assignment.estudiante,
          codigo: assignment.codigo_estudiante,
          fecha: assignment.fecha_cita,
          horario: assignment.horario,
          score: assignment.score,
        } : null,
      },
    };
  }

  list() { return this.repository.list(); }

  getStats() { return this.repository.getStats(); }

  async create(input) {
    const validation = validateCreate(input);
    if (validation.error) throw new ValidationError(validation.error);
    return this.repository.create(validation.value);
  }

  async update(id, input) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new ValidationError('ID inválido');
    const validation = validateUpdate(input);
    if (validation.error) throw new ValidationError(validation.error);
    if (!await this.repository.update(numericId, validation.value)) {
      throw new NotFoundError('Paciente', numericId);
    }
  }

  async deactivate(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new ValidationError('ID inválido');
    if (!await this.repository.deactivate(numericId)) throw new NotFoundError('Paciente', numericId);
  }
}

module.exports = PatientService;
