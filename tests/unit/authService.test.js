const crypto = require('crypto');

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() }));
jest.mock('../../src/adapters/outbound/persistence/mysql/auth.repository', () => jest.fn().mockImplementation(() => ({
  findByEmail: jest.fn(), findByStudentCode: jest.fn(), findById: jest.fn(), create: jest.fn(),
  update: jest.fn(), updateRefreshToken: jest.fn(), updateLastLogin: jest.fn(), updatePassword: jest.fn(),
})));

const bcrypt = require('bcryptjs');
const UserRepository = require('../../src/adapters/outbound/persistence/mysql/auth.repository');
const AuthService = require('../../src/application/auth/auth.service');
const tokenService = require('../../src/adapters/outbound/security/jwt.adapter');
const passwordHasher = require('../../src/adapters/outbound/security/password.adapter');
const { ValidationError, AuthenticationError, ConflictError, NotFoundError } = require('../../src/shared/errors/AppError');

function serviceWithRepository() {
  const service = new AuthService(new UserRepository(), tokenService, passwordHasher);
  return { service, repository: service.userRepository };
}

const user = {
  id: 1, email: 'admin@example.cl', password: 'hash', nombre_completo: 'Admin Demo',
  role: 'admin', status: 'active', permissions: ['matching:execute'],
};

describe('servicio de autenticación', () => {
  beforeEach(() => bcrypt.compare.mockReset());

  test('registra una cuenta válida sin devolver secretos', async () => {
    const { service, repository } = serviceWithRepository();
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockImplementation(value => ({ id: 2, status: 'active', ...value }));
    const result = await service.register({
      email: 'coord@example.cl', password: 'SecurePass123!', confirmPassword: 'SecurePass123!',
      nombre: 'Coordinador', apellido: 'Demo', role: 'coordinator',
    });
    expect(result.user).not.toHaveProperty('password');
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(repository.updateRefreshToken).toHaveBeenCalledWith(2, expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  test('rechaza entradas inválidas y emails duplicados', async () => {
    await expect(serviceWithRepository().service.register({})).rejects.toBeInstanceOf(ValidationError);
    const { service, repository } = serviceWithRepository();
    repository.findByEmail.mockResolvedValue(user);
    await expect(service.register({
      email: user.email, password: 'SecurePass123!', confirmPassword: 'SecurePass123!',
      nombre: 'Admin', apellido: 'Demo', role: 'admin',
    })).rejects.toBeInstanceOf(ConflictError);
  });

  test('inicia sesión solo con usuario activo y contraseña correcta', async () => {
    const { service, repository } = serviceWithRepository();
    repository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    const result = await service.login({ email: user.email, password: 'correcta' });
    expect(result.user).not.toHaveProperty('password');
    expect(repository.updateLastLogin).toHaveBeenCalledWith(1);

    bcrypt.compare.mockResolvedValue(false);
    await expect(service.login({ email: user.email, password: 'incorrecta' })).rejects.toBeInstanceOf(AuthenticationError);
  });

  test('rota el refresh token y compara únicamente su hash', async () => {
    const { service, repository } = serviceWithRepository();
    const refreshToken = tokenService.generateRefreshToken(user);
    repository.findById.mockResolvedValue({
      ...user,
      refresh_token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
    });
    await expect(service.refreshToken(refreshToken)).resolves.toMatchObject({ accessToken: expect.any(String) });
    repository.findById.mockResolvedValue({ ...user, refresh_token_hash: 'otro' });
    await expect(service.refreshToken(refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
  });

  test('cierra sesión e invalida el refresh token', async () => {
    const { service, repository } = serviceWithRepository();
    await service.logout(1);
    expect(repository.updateRefreshToken).toHaveBeenCalledWith(1, null);
  });

  test('cambia la contraseña solo después de validar la actual', async () => {
    const { service, repository } = serviceWithRepository();
    repository.findById.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);
    const input = { currentPassword: 'OldPass123!', newPassword: 'NewSecure123!', confirmNewPassword: 'NewSecure123!' };
    await expect(service.changePassword(1, input)).rejects.toBeInstanceOf(AuthenticationError);
    bcrypt.compare.mockResolvedValue(true);
    await expect(service.changePassword(1, input)).resolves.toMatchObject({ message: 'Contraseña actualizada exitosamente' });
    expect(repository.updatePassword).toHaveBeenCalledWith(1, 'hashed');
  });

  test('lee y actualiza el perfil sin permitir campos arbitrarios', async () => {
    const { service, repository } = serviceWithRepository();
    repository.findById.mockResolvedValue(user);
    repository.update.mockResolvedValue({ ...user, nombre_completo: 'Nombre Nuevo' });
    await expect(service.getProfile(1)).resolves.not.toHaveProperty('password');
    await service.updateProfile(1, { nombre_completo: 'Nombre Nuevo', telefono: '999', role: 'admin' });
    expect(repository.update).toHaveBeenCalledWith(1, { nombre_completo: 'Nombre Nuevo', telefono: '999' });
    repository.findById.mockResolvedValue(null);
    await expect(service.getProfile(99)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.updateProfile(99, {})).rejects.toBeInstanceOf(NotFoundError);
  });

  test('define permisos mínimos por rol y elimina secretos del usuario', () => {
    const { service } = serviceWithRepository();
    expect(service.getPermissionsByRole('admin')).toContain('matching:execute');
    expect(service.getPermissionsByRole('student')).toEqual(['assignments:own']);
    expect(service.getPermissionsByRole('unknown')).toEqual([]);
    expect(service.sanitizeUser({ ...user, refresh_token_hash: 'secret' })).not.toHaveProperty('refresh_token_hash');
    expect(service.sanitizeUser(null)).toBeNull();
  });
});
