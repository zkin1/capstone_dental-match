import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { apiFetch } from '../src/lib/api.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('Vercel dirige la API al backend antes del fallback de la SPA', () => {
  const { rewrites } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const apiIndex = rewrites.findIndex(({ source }) => source === '/api/:path*');
  const spaIndex = rewrites.findIndex(({ destination }) => destination === '/index.html');
  assert.ok(apiIndex >= 0 && apiIndex < spaIndex);
  assert.equal(rewrites[apiIndex].destination, 'https://dental-match-api.vercel.app/api/:path*');
});

test('envía JSON y cookies al mismo sitio al iniciar sesión', async (t) => {
  const data = { success: true, data: { user: { id: 1, role: 'admin' } } };
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse(data));
  const body = JSON.stringify({ email: 'prueba@example.invalid', password: 'clave-de-prueba' });
  assert.deepEqual(await apiFetch('/auth/login', { method: 'POST', body }), data);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/auth/login');
  assert.equal(options.method, 'POST');
  assert.equal(options.body, body);
  assert.equal(options.credentials, 'same-origin');
  assert.equal(options.headers['Content-Type'], 'application/json');
});

test('rechaza HTML con HTTP 200 en lugar de aceptarlo como éxito', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<!doctype html><html></html>'));
  await assert.rejects(apiFetch('/auth/login'), /respuesta válida de Dental Match/);
});

test('rechaza JSON incompleto con HTTP 200', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{"success":'));
  await assert.rejects(apiFetch('/pacientes'), /respuesta válida de Dental Match/);
});

test('conserva el mensaje de error JSON del backend', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({
    success: false, error: { message: 'No tienes permiso para ver este caso' },
  }, 403));
  await assert.rejects(apiFetch('/pacientes/1'), /No tienes permiso para ver este caso/);
});

test('renueva una sesión vencida y reintenta una sola vez con cookies', async (t) => {
  const data = { success: true, data: [] };
  const responses = [
    jsonResponse({ success: false }, 401),
    jsonResponse({ success: true }),
    jsonResponse(data),
  ];
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => responses.shift());
  assert.deepEqual(await apiFetch('/asignaciones/mias'), data);
  assert.deepEqual(fetchMock.mock.calls.map(({ arguments: [url] }) => url), [
    '/api/asignaciones/mias', '/api/auth/refresh-token', '/api/asignaciones/mias',
  ]);
  assert.equal(fetchMock.mock.calls[1].arguments[1].method, 'POST');
  for (const { arguments: [, options] } of fetchMock.mock.calls) {
    assert.equal(options.credentials, 'same-origin');
    assert.equal(Object.hasOwn(options, 'skipRefresh'), false);
  }
});

test('un login rechazado no intenta renovar la sesión', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse({
    success: false, error: { message: 'Credenciales inválidas' },
  }, 401));
  await assert.rejects(apiFetch('/auth/login', { method: 'POST' }), /Credenciales inválidas/);
  assert.equal(fetchMock.mock.callCount(), 1);
});
