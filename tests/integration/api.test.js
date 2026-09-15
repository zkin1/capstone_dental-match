const request = require('supertest');

const mockConnection = { execute: jest.fn(), query: jest.fn(), release: jest.fn() };
jest.mock('../../src/infrastructure/database/connection', () => ({
  getConnection: jest.fn().mockResolvedValue(mockConnection),
  getPoolConnection: jest.fn().mockResolvedValue(mockConnection),
  executeQuery: jest.fn(),
  transaction: jest.fn(async work => work(mockConnection)),
  performHealthCheck: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 1 }),
  closePool: jest.fn(),
}));

const { generateToken } = require('../../src/adapters/outbound/security/jwt.adapter');
const app = require('../../src/infrastructure/http/app');

describe('contrato HTTP del BFF', () => {
  beforeEach(() => {
    mockConnection.execute.mockReset();
    mockConnection.query.mockReset();
  });

  test('publica identidad, arquitectura y salud sin detalles sensibles', async () => {
    const [root, info, health] = await Promise.all([
      request(app).get('/api'), request(app).get('/api/info'), request(app).get('/api/health'),
    ]);
    expect(root.body).toMatchObject({ success: true, version: '3.0.0' });
    expect(info.body.api).toMatchObject({ matching: 'Algoritmo determinista ponderado', ai: 'Pre-categorización solamente' });
    expect(health.body).toMatchObject({ success: true, database: { status: 'healthy' } });
  });

  test.each(['/api/pacientes', '/api/estudiantes', '/api/asignaciones', '/api/matching/stats', '/api/notificaciones'])('protege %s sin sesión', async endpoint => {
    expect((await request(app).get(endpoint)).status).toBe(401);
  });

  test('rechaza intake sin consentimiento antes de escribir en la base', async () => {
    const response = await request(app).post('/api/pacientes/intake').send({
      nombre_completo: 'Paciente Demo', edad: 30, telefono: '912345678', ciudad: 'Metropolitana', respuestas: {},
    });
    expect(response.status).toBe(400);
    expect(mockConnection.execute).not.toHaveBeenCalled();
  });

  test('rechaza un cuestionario vacío aunque exista consentimiento', async () => {
    const response = await request(app).post('/api/pacientes/intake').send({
      nombre_completo: 'Paciente Demo', edad: 30, telefono: '912345678', ciudad: 'Metropolitana',
      respuestas: {}, consentimiento_datos: true,
    });
    expect(response.status).toBe(400);
    expect(mockConnection.execute).not.toHaveBeenCalled();
  });

  test('impide que estudiantes accedan al dashboard administrativo', async () => {
    const token = generateToken({ id: 2, email: 'student@example.cl', role: 'student', codigo_estudiante: 'EST-2026-123456' });
    const response = await request(app).get('/api/dashboard/stats').set('Cookie', `accessToken=${token}`);
    expect(response.status).toBe(403);
  });

  test('un coordinador obtiene métricas normalizadas', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ total: 4, pendientes: 2 }]])
      .mockResolvedValueOnce([[{ total: 3, activos: 3 }]])
      .mockResolvedValueOnce([[{ total: 2, activas: 1, score_promedio: 0.825 }]]);
    const token = generateToken({ id: 3, email: 'coord@example.cl', role: 'coordinator' });
    const response = await request(app).get('/api/dashboard/stats').set('Cookie', `accessToken=${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ pacientes: 4, pacientesPendientes: 2, estudiantes: 3, scorePromedio: 83 });
  });
});
