const {
  ValidationError, NotFoundError, AuthorizationError, ConflictError,
} = require('../../shared/errors/AppError');

class AssignmentService {
  constructor(repository) {
    this.repository = repository;
  }

  async listMine(studentCode) {
    const result = await this.repository.listMine(studentCode);
    if (!result) throw new NotFoundError('Perfil de estudiante');
    return result;
  }

  list() { return this.repository.list(); }

  getStats() { return this.repository.getStats(); }

  async update(id, input, user) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new ValidationError('ID inválido');
    const result = await this.repository.update(numericId, input, user);
    if (result.ok) return result;
    if (result.code === 'NOT_FOUND') throw new NotFoundError('Asignación', numericId);
    if (result.code === 'FORBIDDEN') throw new AuthorizationError(result.message);
    if (result.code === 'CONFLICT') throw new ConflictError(result.message);
    throw new ValidationError(result.message);
  }
}

module.exports = AssignmentService;
