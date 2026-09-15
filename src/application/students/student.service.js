const { ValidationError, ConflictError, NotFoundError } = require('../../shared/errors/AppError');
const {
  validateStudent, normalizeSpecialties, validateStaffUpdate,
} = require('../../domain/students/student.validation');

class StudentService {
  constructor({ repository, passwordHasher }) {
    this.repository = repository;
    this.passwordHasher = passwordHasher;
  }

  async register(input) {
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
    }, await this.passwordHasher.hash(input.password));
    if (result.duplicate) throw new ConflictError('El email ya está registrado');
    return result;
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
      if (validation.value.estado === 'inactivo' && Number(student.casos_activos) > 0) {
        return { activeCases: true };
      }
      return { success: true };
    });
    if (result.missing) throw new NotFoundError('Estudiante', numericId);
    if (result.invalidLoad) throw new ConflictError('La carga máxima no puede ser menor que los casos activos');
    if (result.activeCases) throw new ConflictError('No se puede desactivar un estudiante con casos activos');
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
