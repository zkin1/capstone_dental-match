const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../../../../shared/errors/AppError');
const tokenService = require('../../../outbound/security/jwt.adapter');

function accessTokenFrom(req) {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;
}

function authenticateToken(req, res, next) {
  try {
    const token = accessTokenFrom(req);
    if (!token) throw new AuthenticationError('Sesión requerida');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado');
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'dental-matching-system',
      audience: 'dental-matching-users',
    });
    next();
  } catch (error) {
    next(error instanceof AuthenticationError
      ? error
      : new AuthenticationError(error.name === 'TokenExpiredError' ? 'Sesión expirada' : 'Sesión inválida'));
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
