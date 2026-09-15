const jwt = require('jsonwebtoken');

function generateToken(user, options = {}) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado');
  const permissions = typeof user.permissions === 'string'
    ? JSON.parse(user.permissions || '[]')
    : (user.permissions || []);
  return jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    permissions,
    codigo_estudiante: user.codigo_estudiante || null,
    nombre_completo: user.nombre_completo || null,
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'dental-matching-system',
    audience: 'dental-matching-users',
    ...options,
  });
}

function generateRefreshToken(user) {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET no configurado');
  return jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function verifyRefreshToken(token) {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET no configurado');
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { generateToken, generateRefreshToken, verifyRefreshToken };
