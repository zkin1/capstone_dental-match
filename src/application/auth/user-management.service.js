const { ValidationError } = require('../../shared/errors/AppError');
const { numericId } = require('../assignments/case.service');

class UserManagementService {
  constructor(repository, auth) {
    this.repository = repository;
    this.auth = auth;
  }
  list() {
    return this.repository.listAccounts();
  }
  async create(input) {
    if (!['admin', 'coordinator'].includes(input.role)) {
      throw new ValidationError(
        'Crea los estudiantes desde el registro de estudiantes, con su perfil y horarios'
      );
    }
    return (await this.auth.register(input)).user;
  }
  update(id, input) {
    if (
      !['admin', 'coordinator', 'student'].includes(input.role) ||
      !['active', 'inactive', 'suspended'].includes(input.status)
    ) {
      throw new ValidationError('Rol o estado inválido');
    }
    const name =
      typeof input.nombre_completo === 'string'
        ? input.nombre_completo.trim()
        : '';
    if (name.length < 3 || name.length > 150)
      throw new ValidationError('Indica un nombre de 3 a 150 caracteres');
    return this.repository.manageAccount(numericId(id), {
      role: input.role,
      status: input.status,
      nombre_completo: name,
      permissions: this.auth.getPermissionsByRole(input.role),
    });
  }
}
module.exports = UserManagementService;
