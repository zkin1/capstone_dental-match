const {
  authenticateToken,
  requireRole,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../../src/adapters/inbound/http/middleware/auth');
const { AuthenticationError, AuthorizationError } = require('../../src/shared/errors/AppError');

const request = overrides => ({ headers: {}, cookies: {}, ...overrides });

describe('autenticación del BFF', () => {
  const user = { id: 7, email: 'admin@example.cl', role: 'admin', permissions: [] };

  test('acepta el access token desde una cookie HttpOnly', () => {
    const req = request({ cookies: { accessToken: generateToken(user) } });
    const next = jest.fn();
    authenticateToken(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: 7, role: 'admin' });
  });

  test('acepta el access token Bearer y normaliza permisos serializados', () => {
    const token = generateToken({ ...user, permissions: '["patients:write"]' });
    const req = request({ headers: { authorization: `Bearer ${token}` } });
    const next = jest.fn();
    authenticateToken(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user.permissions).toEqual(['patients:write']);
  });

  test('rechaza sesión ausente, inválida y expirada', () => {
    for (const req of [
      request(),
      request({ cookies: { accessToken: 'invalid' } }),
      request({ cookies: { accessToken: generateToken(user, { expiresIn: '-1s' }) } }),
    ]) {
      const next = jest.fn();
      authenticateToken(req, {}, next);
      expect(next.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
    }
  });

  test('aplica roles de menor privilegio', () => {
    const allowed = jest.fn();
    requireRole(['admin', 'coordinator'])(request({ user }), {}, allowed);
    expect(allowed).toHaveBeenCalledWith();

    const denied = jest.fn();
    requireRole('student')(request({ user }), {}, denied);
    expect(denied.mock.calls[0][0]).toBeInstanceOf(AuthorizationError);

    const missing = jest.fn();
    requireRole('admin')(request(), {}, missing);
    expect(missing.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
  });

  test('genera y verifica refresh tokens separados', () => {
    expect(verifyRefreshToken(generateRefreshToken(user))).toMatchObject({ id: 7, type: 'refresh' });
  });
});
