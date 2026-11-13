// Complementa el recorrido visual con rutas sin controles en la interfaz.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const config = require('dotenv').parse(fs.readFileSync('.env.e2e.demo'));
const base = config.E2E_LOCAL_BASE_URL;
assert(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Solo cohorte local de prueba'
);
const results = [];
let cookie = '';

async function api(method, route, body, expected = 200, session = cookie) {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: session,
      'X-Forwarded-For': '127.0.0.77',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  results.push({
    method,
    route,
    expected,
    observed: response.status,
    passed: response.status === expected,
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${route}: ${data.message || data.error?.message || 'respuesta inesperada'}`
  );
  return { response, data };
}

function cookies(response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
}

async function main() {
  let currentPassword = config.E2E_PASSWORD;
  let originalProfile;
  try {
    await api('GET', '/pacientes', undefined, 401, '');
    await api(
      'POST',
      '/auth/login',
      { email: 'invalid', password: 'invalid' },
      400,
      ''
    );
    const login = await api(
      'POST',
      '/auth/login',
      { email: config.E2E_COORDINATOR_EMAIL, password: currentPassword },
      200,
      ''
    );
    cookie = cookies(login.response);
    assert(
      login.response.headers
        .getSetCookie()
        .every(
          (value) =>
            value.includes('HttpOnly') && value.includes('SameSite=Strict')
        )
    );
    originalProfile = (await api('GET', '/auth/profile')).data.data;
    assert.equal(originalProfile.role, 'coordinator');
    assert(
      !('password' in originalProfile) &&
        !('refresh_token_hash' in originalProfile)
    );
    await api('GET', '/auth/validate-token');
    for (const route of [
      '/dashboard/stats',
      '/pacientes/stats',
      '/estudiantes/stats',
      '/asignaciones/stats',
      '/matching/weights',
      '/matching/stats',
      '/matching/pending',
      '/notificaciones?limit=1',
    ]) {
      await api('GET', route);
    }
    await api('GET', '/users', undefined, 403);
    await api('GET', '/auth/roles', undefined, 403);
    await api('POST', '/auth/register', {}, 403);
    await api(
      'POST',
      '/matching/agent-preview',
      { answers: {}, edad: 30 },
      400
    );
    await api(
      'POST',
      '/pacientes/intake',
      {
        nombre_completo: 'DM-E2E-20261020 Validación',
        edad: 30,
        telefono: '900000099',
        ciudad: 'Concepción',
        consentimiento_datos: false,
        respuestas: { intensidad_dolor: 4 },
      },
      400,
      ''
    );
    await api('PUT', '/auth/profile', {
      nombre_completo: 'DM-E2E-20261020 Coordinación API',
      telefono: '900000088',
    });
    assert.equal(
      (await api('GET', '/auth/profile')).data.data.nombre_completo,
      'DM-E2E-20261020 Coordinación API'
    );
    const nextPassword = `DmE2E!${crypto.randomBytes(15).toString('base64url')}`;
    await api(
      'PUT',
      '/auth/change-password',
      {
        currentPassword: 'incorrecta',
        newPassword: nextPassword,
        confirmNewPassword: nextPassword,
      },
      401
    );
    await api('PUT', '/auth/change-password', {
      currentPassword,
      newPassword: nextPassword,
      confirmNewPassword: nextPassword,
    });
    currentPassword = nextPassword;
    await api(
      'POST',
      '/auth/login',
      { email: config.E2E_COORDINATOR_EMAIL, password: config.E2E_PASSWORD },
      401,
      ''
    );
    cookie = cookies(
      (
        await api(
          'POST',
          '/auth/login',
          { email: config.E2E_COORDINATOR_EMAIL, password: currentPassword },
          200,
          ''
        )
      ).response
    );
    const oldCookie = cookie;
    // Separar segundos permite comprobar la rotación actual, basada en iat.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    cookie = cookies((await api('POST', '/auth/refresh-token', {})).response);
    await api('POST', '/auth/refresh-token', {}, 401, oldCookie);
    await api('PUT', '/auth/change-password', {
      currentPassword,
      newPassword: config.E2E_PASSWORD,
      confirmNewPassword: config.E2E_PASSWORD,
    });
    currentPassword = config.E2E_PASSWORD;
    await api('PUT', '/auth/profile', {
      nombre_completo: originalProfile.nombre_completo,
      telefono: originalProfile.telefono,
    });
    await api('POST', '/auth/logout', {});
    await api('POST', '/auth/refresh-token', {}, 401);
    cookie = '';
    const student = await api(
      'POST',
      '/auth/login',
      { email: config.E2E_ALTERNATE_EMAIL, password: config.E2E_PASSWORD },
      200,
      ''
    );
    cookie = cookies(student.response);
    await api('GET', '/asignaciones/mias');
    for (const route of [
      '/pacientes',
      '/estudiantes',
      '/dashboard/stats',
      '/users',
      '/notificaciones',
    ])
      await api('GET', route, undefined, 403);
    await api('POST', '/auth/logout', {});
  } finally {
    if (currentPassword !== config.E2E_PASSWORD && cookie) {
      await api('PUT', '/auth/change-password', {
        currentPassword,
        newPassword: config.E2E_PASSWORD,
        confirmNewPassword: config.E2E_PASSWORD,
      });
    }
    fs.writeFileSync(
      require('node:path').resolve(
        __dirname,
        '..',
        'instrucciones para Nota 2 Capstone',
        'evidencias',
        'recorrido-20261020',
        'api-resultados-local.json'
      ),
      JSON.stringify(
        {
          environment: 'local',
          base,
          capturedAt: new Date().toISOString(),
          results,
        },
        null,
        2
      )
    );
  }
  console.log(
    JSON.stringify({
      environment: 'local',
      passed: results.filter((r) => r.passed).length,
      total: results.length,
    })
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
