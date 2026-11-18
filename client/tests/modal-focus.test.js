/* global process */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const student = { id: 31, nombre_completo: 'Estudiante de prueba', codigo_estudiante: 'EST-TEST-31',
  email: 'student@example.com', telefono: '900000031', universidad: 'Universidad de prueba',
  año_carrera: '5to', ciudad: 'Concepción', casos_necesarios: 10, casos_activos: 0, cuenta_estado: 'active' };
const patient = { id: 41, nombre_completo: 'Paciente de prueba', email: 'patient@example.com',
  telefono: '900000041', edad: 32, ciudad: 'Concepción', tipo_tratamiento_inferido: 'Operatoria Dental',
  prioridad: 'Moderada', nivel_dolor: 0, estado: 'pendiente' };
const account = { id: 51, nombre_completo: 'Cuenta de prueba', email: 'account@example.com', role: 'coordinator', status: 'active' };
let server, browser, base;

before(async () => {
  server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false,
    plugins: [react()], server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
});
after(async () => { await browser?.close(); await server?.close(); });

for (const width of [1440, 390]) {
  for (const scenario of [
    { path: '/students', endpoint: '/api/estudiantes', row: student, edit: 'Editar a Estudiante de prueba', title: 'Editar estudiante' },
    { path: '/patients', endpoint: '/api/pacientes', row: patient, edit: 'Editar a Paciente de prueba', title: 'Editar paciente' },
    { path: '/users', endpoint: '/api/users', row: account, edit: 'Editar cuenta', title: 'Editar cuenta' },
  ]) {
    test(`${scenario.title}: escribir, guardar y cerrar con teclado a ${width}px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(10000);
      const errors = [];
      const writes = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname === '/api/auth/validate-token') return route.fulfill({ json: { success: true,
          data: { user: { id: 1, nombre_completo: 'QA', email: 'qa@example.com', role: scenario.path === '/users' ? 'admin' : 'coordinator' } } } });
        if (url.pathname === scenario.endpoint && request.method() === 'GET')
          return route.fulfill({ json: { success: true, data: [scenario.row] } });
        if (url.pathname === `${scenario.endpoint}/${scenario.row.id}` && request.method() === 'PUT') {
          writes.push(request.postDataJSON());
          return route.fulfill({ json: { success: true, data: {} } });
        }
        errors.push(`API inesperada: ${request.method()} ${url.pathname}`);
        return route.fulfill({ status: 500, json: { error: 'API inesperada' } });
      });
      try {
        await page.goto(base + scenario.path);
        const trigger = page.getByRole('button', { name: scenario.edit, exact: true });
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: scenario.title, exact: true });
        const field = dialog.getByRole('textbox', { name: /^Nombre completo/ });
        const close = dialog.getByRole('button', { name: 'Cerrar diálogo' });
        const save = dialog.getByRole('button', { name: /^Guardar/ });
        await field.click();
        await field.press('End');
        for (const character of '_QA') {
          await page.keyboard.type(character);
          assert(await field.evaluate(el => el === document.activeElement), 'Escribir no debe mover el foco a la X');
        }
        await field.evaluate(el => el.setSelectionRange(0, 0));
        await page.keyboard.type('Nuevo ');
        const expected = `Nuevo ${scenario.row.nombre_completo}_QA`;
        assert.equal(await field.inputValue(), expected);
        assert.equal(await field.evaluate(el => el.selectionStart), 6, 'Se debe conservar la posición del cursor');
        await close.focus();
        await page.keyboard.press('Shift+Tab');
        assert(await save.evaluate(el => el === document.activeElement));
        await page.keyboard.press('Tab');
        assert(await close.evaluate(el => el === document.activeElement));
        await save.click();
        await dialog.waitFor({ state: 'detached' });
        assert.equal(writes[0]?.nombre_completo, expected, 'Guardar debe enviar el texto completo');
        for (const method of ['Escape', 'X', 'backdrop']) {
          await trigger.click();
          await field.click();
          await page.keyboard.type('z');
          if (method === 'Escape') await page.keyboard.press('Escape');
          else if (method === 'X') await close.click();
          else await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
          await dialog.waitFor({ state: 'detached' });
          assert(await trigger.evaluate(el => el === document.activeElement), 'Cerrar debe devolver el foco al botón de edición');
        }
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
}
