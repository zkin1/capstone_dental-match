const { ValidationError, ConflictError, NotFoundError } = require('../../shared/errors/AppError');
const {
  DAYS, validateStudent, normalizeSpecialties, validateStaffUpdate,
} = require('../../domain/students/student.validation');

function scheduleInput(input) {
  const { dia_semana, dias_semana, hora_inicio, hora_fin } = input || {};
  const days = dias_semana === undefined ? [dia_semana] : dias_semana;
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!Array.isArray(days) || !days.length || days.length > DAYS.length ||
      days.some(day => !DAYS.includes(day)) || new Set(days).size !== days.length ||
      typeof hora_inicio !== 'string' || typeof hora_fin !== 'string' ||
      !clock.test(hora_inicio) || !clock.test(hora_fin) || hora_inicio >= hora_fin)
    throw new ValidationError('Selecciona al menos un día y una hora de inicio anterior al término');
  return { dias_semana: days, hora_inicio, hora_fin };
}

function parseScheduleId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Horario inválido');
  return id;
}

class StudentService {
  constructor({ repository, passwordHasher }) {
    this.repository = repository;
    this.passwordHasher = passwordHasher;
  }

  async register(input, { approved = true } = {}) {
    const validationError = validateStudent(input, true);
    if (validationError) throw new ValidationError(validationError);
    const specialties = normalizeSpecialties(input.especialidades);
    if (!specialties) throw new ValidationError('Hay una especialidad no válida o duplicada');

    const result = await this.repository.register({
      nombre_completo: input.nombre_completo.trim(),
      año_carrera: input.año_carrera,
      telefono: input.telefono?.trim() || null,
      email: input.email.toLowerCase(),
      universidad: input.universidad?.trim() || null,
      ciudad: input.ciudad,
      casos_necesarios: Math.max(1, Math.min(50, Number(input.casos_necesarios) || 10)),
      specialties,
      schedules: input.horarios_disponibles,
    }, await this.passwordHasher.hash(input.password), approved);
    if (result.duplicate) throw new ConflictError('El email ya está registrado');
    return result;
  }

  availability(code) {
    return this.repository.availability(code);
  }

  updateSchedule(code, scheduleId, input) {
    return this.repository.updateSchedule(code, parseScheduleId(scheduleId), scheduleInput(input));
  }

  createSchedule(code, input) {
    const schedule = scheduleInput(input);
    if (typeof input.clinica !== 'string' || !input.clinica.trim() || input.clinica.length > 80)
      throw new ValidationError('Selecciona una clínica habilitada en tu perfil');
    return this.repository.createSchedule(code, { ...schedule, clinica: input.clinica.trim() });
  }

  removeSchedule(code, id) {
    return this.repository.removeSchedule(code, parseScheduleId(id));
  }

  updateAbsence(code, date, blocked) {
    const parsed = new Date(date);
    if (typeof date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
      throw new ValidationError('Selecciona una fecha válida');
    return this.repository.updateAbsence(code, date, blocked);
  }

  list() { return this.repository.list(); }

  getStats() { return this.repository.getStats(); }

  async update(id, input) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new ValidationError('ID inválido');
    const validation = validateStaffUpdate(input);
    if (validation.error) throw new ValidationError(validation.error);
    const result = await this.repository.update(numericId, validation.value, student => {
      if (validation.value.casos_necesarios !== undefined
        && Number(validation.value.casos_necesarios) < Number(student.casos_activos)) {
        return { invalidLoad: true };
      }
      return { success: true };
    });
    if (result.missing) throw new NotFoundError('Estudiante', numericId);
    if (result.invalidLoad) throw new ConflictError('La carga máxima no puede ser menor que los casos activos');
  }

  async setAccountStatus(id, status) {
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId) || numericId < 1) throw new ValidationError('ID inválido');
    if (!['active', 'suspended'].includes(status))
      throw new ValidationError('Estado de cuenta inválido');
    return this.repository.setAccountStatus(numericId, status);
  }

  async deactivate(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new ValidationError('ID inválido');
    const result = await this.repository.deactivate(numericId);
    if (result.missing) throw new NotFoundError('Estudiante', numericId);
    if (result.activeCases) throw new ConflictError('No se puede desactivar un estudiante con casos activos');
  }
}

module.exports = StudentService;
