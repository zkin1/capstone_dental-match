const mockFindById = jest.fn();
jest.mock(
  '../../src/adapters/outbound/persistence/postgres/auth.repository',
  () => jest.fn().mockImplementation(() => ({ findById: mockFindById }))
);
const {
  authenticateToken,
  requireRole,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../../src/adapters/inbound/http/middleware/auth');
const {
  AuthenticationError,
  AuthorizationError,
} = require('../../src/shared/errors/AppError');

const request = (overrides) => ({ headers: {}, cookies: {}, ...overrides });

describe('autenticación del BFF', () => {
  const user = {
    id: 7,
    email: 'admin@example.cl',
    role: 'admin',
    permissions: [],
  };
  beforeEach(() =>
    mockFindById.mockResolvedValue({ ...user, status: 'active' })
  );

  test('acepta el access token desde una cookie HttpOnly', async () => {
    const req = request({ cookies: { accessToken: generateToken(user) } });
    const next = jest.fn();
    await authenticateToken(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: 7, role: 'admin' });
  });

  test('acepta el access token Bearer y toma los permisos vigentes', async () => {
    mockFindById.mockResolvedValue({
      ...user,
      status: 'active',
      permissions: ['patients:write'],
    });
    const token = generateToken({ ...user, permissions: '["patients:write"]' });
    const req = request({ headers: { authorization: `Bearer ${token}` } });
    const next = jest.fn();
    await authenticateToken(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user.permissions).toEqual(['patients:write']);
  });

  test('rechaza sesión ausente, inválida y expirada', async () => {
    for (const req of [
      request(),
      request({ cookies: { accessToken: 'invalid' } }),
      request({
        cookies: { accessToken: generateToken(user, { expiresIn: '-1s' }) },
      }),
    ]) {
      const next = jest.fn();
      await authenticateToken(req, {}, next);
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
    expect(verifyRefreshToken(generateRefreshToken(user))).toMatchObject({
      id: 7,
      type: 'refresh',
    });
  });
  test('aplica la suspensión y el rol actual aunque el token siga válido', async () => {
    const req = request({ cookies: { accessToken: generateToken(user) } });
    mockFindById.mockResolvedValue({ ...user, status: 'suspended' });
    const denied = jest.fn();
    await authenticateToken(req, {}, denied);
    expect(denied.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
    mockFindById.mockResolvedValue({
      ...user,
      status: 'active',
      role: 'student',
    });
    const next = jest.fn();
    await authenticateToken(req, {}, next);
    expect(req.user.role).toBe('student');
  });
  test('un fallo de persistencia se propaga y no se confunde con una sesión inválida', async () => {
    const error = new Error('database offline');
    mockFindById.mockRejectedValue(error);
    const next = jest.fn();
    await authenticateToken(
      request({ cookies: { accessToken: generateToken(user) } }),
      {},
      next
    );
    expect(next).toHaveBeenCalledWith(error);
  });
});
