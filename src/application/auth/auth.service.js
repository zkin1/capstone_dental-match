const crypto = require('crypto');
const { ValidationError, NotFoundError, AuthenticationError, ConflictError } = require('../../shared/errors/AppError');
const { CreateUserDTO, LoginDTO, ChangePasswordDTO } = require('./auth.schemas');

const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');

class AuthService {
  constructor(userRepository, tokenService, passwordHasher) {
    if (!userRepository || !tokenService || !passwordHasher) {
      throw new Error('AuthService requiere puertos de usuarios, tokens y contraseñas');
    }
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.passwordHasher = passwordHasher;
  }

  async issueTokens(user) {
    const accessToken = this.tokenService.generateToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);
    await this.userRepository.updateRefreshToken(user.id, tokenHash(refreshToken));
    return { accessToken, refreshToken, expiresIn: process.env.JWT_EXPIRES_IN || '24h' };
  }

  async register(input) {
    const { error, value } = CreateUserDTO.validate(input);
    if (error) throw new ValidationError(error.details.map(detail => detail.message).join(', '));
    if (await this.userRepository.findByEmail(value.email)) throw new ConflictError('El email ya está registrado');
    if (value.role === 'student' && await this.userRepository.findByStudentCode(value.codigoEstudiante)) {
      throw new ConflictError('El código de estudiante ya está vinculado');
    }

    const user = await this.userRepository.create({
      email: value.email.toLowerCase(),
      password: await this.passwordHasher.hash(value.password),
      nombre_completo: `${value.nombre} ${value.apellido}`.trim(),
      role: value.role,
      permissions: this.getPermissionsByRole(value.role),
      telefono: value.telefono,
      codigo_estudiante: value.codigoEstudiante,
    });
    return { user: this.sanitizeUser(user), tokens: await this.issueTokens(user) };
  }

  async login(input) {
    const { error, value } = LoginDTO.validate(input);
    if (error) throw new ValidationError(error.details.map(detail => detail.message).join(', '));
    const user = await this.userRepository.findByEmail(value.email.toLowerCase());
    if (!user || user.status !== 'active' || !await this.passwordHasher.compare(value.password, user.password)) {
      throw new AuthenticationError('Credenciales inválidas');
    }
    await this.userRepository.updateLastLogin(user.id);
    return { user: this.sanitizeUser(user), tokens: await this.issueTokens(user) };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findById(decoded.id);
      if (!user || user.status !== 'active' || user.refresh_token_hash !== tokenHash(refreshToken)) {
        throw new Error('invalid');
      }
      return this.issueTokens(user);
    } catch {
      throw new AuthenticationError('Refresh token inválido o expirado');
    }
  }

  async logout(userId) {
    await this.userRepository.updateRefreshToken(userId, null);
  }

  async changePassword(userId, input) {
    const { error, value } = ChangePasswordDTO.validate(input);
    if (error) throw new ValidationError(error.details.map(detail => detail.message).join(', '));
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario');
    if (!await this.passwordHasher.compare(value.currentPassword, user.password)) {
      throw new AuthenticationError('Contraseña actual incorrecta');
    }
    await this.userRepository.updatePassword(userId, await this.passwordHasher.hash(value.newPassword));
    return { message: 'Contraseña actualizada exitosamente' };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId, input) {
    if (!await this.userRepository.findById(userId)) throw new NotFoundError('Usuario');
    return this.sanitizeUser(await this.userRepository.update(userId, {
      nombre_completo: input.nombre_completo,
      telefono: input.telefono,
    }));
  }

  getPermissionsByRole(role) {
    const permissions = {
      admin: ['users:write', 'patients:write', 'students:write', 'assignments:write', 'matching:execute'],
      coordinator: ['patients:write', 'students:write', 'assignments:write', 'matching:execute'],
      student: ['assignments:own'],
    };
    return permissions[role] || [];
  }

  sanitizeUser(user) {
    if (!user) return null;
    const safe = { ...user };
    delete safe.password;
    delete safe.refresh_token_hash;
    return safe;
  }
}

module.exports = AuthService;
