const jwt = require('jsonwebtoken');
const {
  AuthenticationError,
  AuthorizationError,
} = require('../../../../shared/errors/AppError');
const tokenService = require('../../../outbound/security/jwt.adapter');
const UserRepository = require('../../../outbound/persistence/postgres/auth.repository');
const users = new UserRepository();

function accessTokenFrom(req) {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ')
    ? header.slice(7)
    : req.cookies?.accessToken;
}

async function authenticateToken(req, res, next) {
  let decoded;
  try {
    const token = accessTokenFrom(req);
    if (!token) throw new AuthenticationError('Sesión requerida');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado');
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'dental-matching-system',
      audience: 'dental-matching-users',
    });
  } catch (error) {
    return next(
      error instanceof AuthenticationError
        ? error
        : new AuthenticationError(
            error.name === 'TokenExpiredError'
              ? 'Sesión expirada'
              : 'Sesión inválida'
          )
    );
  }
  try {
    const current = await users.findById(decoded.id);
    if (!current || current.status !== 'active')
      throw new AuthenticationError('Cuenta inactiva o sesión inválida');
    req.user = {
      id: current.id,
      email: current.email,
      nombre_completo: current.nombre_completo,
      role: current.role,
      permissions: current.permissions,
      codigo_estudiante: current.codigo_estudiante,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return next(new AuthenticationError('Sesión requerida'));
    return allowed.includes(req.user.role)
      ? next()
      : next(new AuthorizationError('No tienes permisos para esta operación'));
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  ...tokenService,
};
