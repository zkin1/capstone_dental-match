#!/usr/bin/env node
// Real HTTP + PostgreSQL, synthetic data and a schema owned by this run.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

async function startTestServer() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
    throw new Error('Define TEST_DATABASE_URL con PostgreSQL local de prueba');
  }
  const schema = `capstone_system_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
  Object.assign(process.env, {
    NODE_ENV: 'development', DATABASE_URL: url, DB_SCHEMA: schema,
    DB_CONNECTION_LIMIT: '8', JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
    AI_AGENT_URL: 'http://127.0.0.1:1', AI_AGENT_TIMEOUT_MS: '1000',
    TZ: 'America/Santiago',
  });
  const database = require('../src/infrastructure/database/connection');
  const MigrationManager = require('../src/infrastructure/database/migrationManager');
  let server;
  const close = async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    try { await database.executeQuery(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); }
    finally { await database.closePool(); }
  };
  try {
    await database.initialize();
    const manager = new MigrationManager(await database.getConnection());
    await manager.initialize();
    await manager.migrate();
    assert.equal((await manager.migrate()).executed, 0);
    assert.equal((await manager.status()).pending.length, 0);
    const password = 'DentalDemo!2026';
    const hash = await require('bcryptjs').hash(password, 10);
    for (const role of ['admin', 'coordinator']) {
      await database.executeQuery(
        'INSERT INTO users(email,password,nombre_completo,role) VALUES ($1,$2,$3,$4)',
        [`${role}@example.com`, hash, `Demo ${role}`, role]
      );
    }
    const app = require('../src/infrastructure/http/app');
    server = await new Promise(resolve => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    return { base: `http://127.0.0.1:${server.address().port}`, database, close, password };
  } catch (error) {
    await close();
    throw error;
  }
}

async function run() {
  assert(fs.existsSync(path.join(__dirname, '../client/dist/index.html')), 'Primero ejecuta npm --prefix client run build');
  const context = await startTestServer();
  const { base, database, password } = context;
  const checks = [];
  const metrics = [];
  async function api(method, route, body, cookie = '', status = 200, headers = {}) {
    const response = await fetch(`${base}/api${route}`, {
      method, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(data)}`);
    return { data, response };
  }
  const login = async (email) => {
    const result = await api('POST', '/auth/login', { email, password });
    const cookies = result.response.headers.getSetCookie();
    assert(cookies.every(value => value.includes('HttpOnly') && value.includes('SameSite=Strict')));
    return cookies.map(value => value.split(';')[0]).join('; ');
  };
  try {
    const admin = await login('admin@example.com');
    const coord = await login('coordinator@example.com');
    const input = n => ({
      nombre_completo: `Estudiante sintético ${n}`, email: `student${n}@example.com`,
      password, confirmPassword: password, ciudad: 'Metropolitana', año_carrera: '5to',
      casos_necesarios: 10, especialidades: ['Operatoria Dental', 'Endodoncia'],
      horarios_disponibles: [{ dia: 'lunes', hora_inicio: '08:00', hora_fin: '12:00', capacidad_pacientes: 10 }],
      role: 'admin',
    });
    for (const [n, cookie] of [[1, admin], [2, coord]]) {
      await api('POST', '/estudiantes', input(n), cookie, 201);
    }
    const student1 = await login('student1@example.com');
    const student2 = await login('student2@example.com');
    const students = (await api('GET', '/estudiantes', undefined, admin)).data.data;
    checks.push('Admin y coordinador crean estudiante con cuenta, especialidades y horarios; login con cookies HttpOnly');

    await api('POST', '/estudiantes', input(3), '', 401);
    await api('POST', '/estudiantes', input(3), student1, 403);
    await api('POST', '/estudiantes', input(1), admin, 409);
    await api('POST', '/estudiantes', { ...input(3), password: 'weak' }, admin, 400);
    const roles = await database.executeQuery("SELECT role FROM users WHERE email LIKE 'student%@example.com'");
    assert(roles.rows.every(row => row.role === 'student'));
    checks.push('401 anónimo, 403 estudiante, 409 email duplicado, validación de contraseña y protección de rol');

    const patient = { nombre_completo: 'Paciente sintético de sistema', edad: 30,
      telefono: '900000001', email: 'patient@example.com', ciudad: 'Metropolitana',
      consentimiento_datos: true, respuestas: { intensidad_dolor: 4 } };
    await api('POST', '/pacientes/intake', { ...patient, consentimiento_datos: false }, '', 400);
    const intake = (await api('POST', '/pacientes/intake', patient, '', 201)).data.data;
    assert(intake.numeroCaso.startsWith('CASO-'));
    assert(intake.estudianteAsignado, 'El intake debe asignarse al estudiante compatible');
    const assignment = (await api('GET', '/asignaciones', undefined, admin)).data.data
      .find(row => row.id_paciente === intake.id);
    assert(assignment);
    const origin = students.find(row => row.id === assignment.id_estudiante);
    const ownerCookie = origin.email === 'student1@example.com' ? student1 : student2;
    const otherCookie = ownerCookie === student1 ? student2 : student1;
    const detail = (await api('GET', `/asignaciones/${assignment.id}/detalle`, undefined, ownerCookie)).data.data;
    assert.equal(detail.paciente.email, patient.email);
    await api('GET', `/asignaciones/${assignment.id}/detalle`, undefined, otherCookie, 403);
    await api('PUT', `/asignaciones/${assignment.id}`, { estado: 'contactado', observaciones_estudiante: 'Paciente contactado para evaluación' }, ownerCookie);
    const qualification = { specialty: 'Endodoncia', priority: 'Alta', treatment: 'Evaluación endodóntica', reason: 'Tratamiento sugerido tras revisar el caso' };
    const proposal = (await api('POST', `/asignaciones/${assignment.id}/derivacion`, qualification, ownerCookie, 201)).data.data;
    await api('POST', `/derivaciones/${proposal.id}/revision`, { ...qualification, estado: 'aprobada', motivo_revision: 'Clasificación revisada por administrador' }, ownerCookie, 403);
    const approved = (await api('POST', `/derivaciones/${proposal.id}/revision`, { ...qualification, estado: 'aprobada', motivo_revision: 'Clasificación revisada por administrador' }, admin)).data.data;
    assert(approved.matching.success);
    const destination = approved.matching.assignmentId;
    const receiverCase = (await api('GET', `/asignaciones/${destination}/detalle`, undefined, otherCookie)).data.data;
    assert.equal(receiverCase.validacion.specialty, 'Endodoncia');
    for (const estado of ['contactado', 'en_tratamiento', 'completado']) {
      await api('PUT', `/asignaciones/${destination}`, { estado, observaciones_estudiante: `Caso de prueba: ${estado}` }, otherCookie);
    }
    const finalCase = (await api('GET', `/pacientes/${intake.id}`, undefined, admin)).data.data;
    assert(finalCase.historial.some(event => event.tipo === 'derivacion_aprobada'));
    assert(finalCase.asignaciones.some(row => row.id === destination && row.estado === 'completado'));
    const load = (await api('GET', '/estudiantes', undefined, admin)).data.data;
    assert(load.every(row => row.casos_activos === 0));
    checks.push('Intake con fallback → asignación → contacto → derivación → aprobación → tratamiento → completado; historial y cupos consistentes');

    for (const route of ['/pacientes', '/estudiantes', '/asignaciones', '/matching/pending', '/notificaciones', '/users']) {
      await api('GET', route, undefined, '', 401);
      await api('GET', route, undefined, student1, 403);
    }
    await api('GET', '/users', undefined, coord, 403);
    await api('GET', '/pacientes/1%20OR%201=1', undefined, admin, 400);
    await api('POST', '/auth/login', { email: "' OR 1=1 --", password: 'bad' }, '', 400);
    const malformed = await fetch(`${base}/api/estudiantes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: admin }, body: '{broken' });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(`${base}/api/estudiantes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: admin }, body: JSON.stringify({ data: 'x'.repeat(1024 * 1024) }) });
    assert.equal(oversized.status, 413);
    const health = (await api('GET', '/health')).response;
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-powered-by'), null);
    assert(health.headers.get('x-request-id'));
    checks.push('Permisos de rutas, entrada SQL, JSON inválido, límite de body, cabeceras y ausencia de X-Powered-By');

    // Data volume + real database queries, no third-party traffic or clinical data.
    await database.executeQuery(`INSERT INTO pacientes(nombre_completo,edad,telefono,ciudad,tipo_tratamiento_inferido)
      SELECT 'Paciente carga ' || n,30,'900000001','Metropolitana','Operatoria Dental' FROM generate_series(1,100) n`);
    const routes = ['/dashboard/stats', '/pacientes', '/estudiantes', '/asignaciones', '/matching/pending'];
    for (const [concurrency, total] of [[1, 30], [10, 100], [50, 250]]) {
      const latencies = [];
      let next = 0;
      const start = performance.now();
      await Promise.all(Array.from({ length: concurrency }, async () => {
        while (next < total) {
          const index = next++;
          const before = performance.now();
          await api('GET', routes[index % routes.length], undefined, admin);
          latencies.push(performance.now() - before);
        }
      }));
      latencies.sort((a, b) => a - b);
      const durationMs = performance.now() - start;
      const p95Ms = latencies[Math.ceil(latencies.length * 0.95) - 1];
      assert(p95Ms < 3000, `p95 excede 3 segundos con concurrencia ${concurrency}`);
      metrics.push({ concurrency, requests: total, errors: 0, p95Ms: Math.round(p95Ms), maxMs: Math.round(latencies.at(-1)), requestsPerSecond: Math.round(total * 1000 / durationMs) });
    }
    await api('GET', '/health');
    checks.push('Rendimiento/estrés local: 380 lecturas con 100 pacientes, concurrencia 1/10/50, sin 5xx y recuperación saludable');

    // The real 500-request limiter remains enabled in this suite.
    let limited = 0;
    for (let n = 0; n < 501; n++) {
      const result = await fetch(`${base}/api/info`, { headers: { 'X-Forwarded-For': '127.0.0.2' } });
      if (result.status === 429) limited++;
      else assert.equal(result.status, 200);
      await result.text();
    }
    assert.equal(limited, 1);
    checks.push('Rate limit real: petición 501 devuelve 429');
    await api('POST', '/auth/logout', {}, student1);
    await api('POST', '/auth/refresh-token', {}, student1, 401);
    checks.push('Logout invalida el refresh token');
    console.log(JSON.stringify({ status: 'passed', environment: 'local synthetic PostgreSQL', checks, metrics }, null, 2));
  } finally { await context.close(); }
}

if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { startTestServer };
