#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { startTestServer } = require('./test-system');

async function run() {
  const server = await startTestServer();
  let browser;
  let adminPage;
  const errors = [];
  const checks = [];
  const evidence = path.join(__dirname, '../docs/evidencias');
  await fs.mkdir(evidence, { recursive: true });
  try {
    browser = await chromium.launch({ headless: true });
    adminPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    adminPage.on('pageerror', error => errors.push(error.message));
    const login = async (page, email) => {
      await page.goto(`${server.base}/login`);
      await page.getByLabel(/^Email/).fill(email);
      await page.getByLabel(/^Contraseña/).fill(server.password);
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    };
    const fill = async (container, email, name) => {
      await container.getByLabel(/^Nombre completo/).fill(name);
      await container.getByLabel(/^Email/).fill(email);
      await container.getByLabel(/^Contraseña/).fill(server.password);
      await container.getByLabel(/^Confirmar contraseña/).fill(server.password);
      await container.getByLabel('Teléfono', { exact: true }).fill('900000001');
      await container.getByText('Endodoncia', { exact: true }).click();
      await container.getByText('Lunes', { exact: true }).click();
      assert(await container.getByRole('checkbox', { name: 'Endodoncia', exact: true }).isChecked());
      assert(await container.getByRole('checkbox', { name: 'Lunes', exact: true }).isChecked());
    };
    await login(adminPage, 'admin@example.com');
    await adminPage.waitForURL(server.base + '/');
    await adminPage.getByRole('link', { name: 'Estudiantes', exact: true }).click();
    await adminPage.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    let dialog = adminPage.getByRole('dialog', { name: 'Crear estudiante' });
    await fill(dialog, 'ui-student@example.com', 'Estudiante de prueba UI');
    await dialog.getByLabel(/^Confirmar contraseña/).fill('Different!2026');
    await dialog.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    await dialog.getByRole('alert').filter({ hasText: 'Las contraseñas no coinciden' }).waitFor();
    checks.push('Admin abre formulario y recibe validación visible cuando no coinciden contraseñas');
    await dialog.getByLabel(/^Confirmar contraseña/).fill(server.password);
    await dialog.evaluate(element => { element.scrollTop = 0; });
    await dialog.screenshot({ path: path.join(evidence, 'crear-estudiante-formulario-20261005.png'), animations: 'disabled' });
    const created = adminPage.waitForResponse(response => response.url() === `${server.base}/api/estudiantes` && response.request().method() === 'POST' && response.status() === 201);
    await dialog.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    await created;
    await dialog.waitFor({ state: 'hidden' });
    await adminPage.getByRole('cell', { name: 'Estudiante de prueba UI', exact: true }).waitFor();
    assert.equal(new URL(adminPage.url()).pathname, '/students');
    checks.push('Admin crea estudiante dentro del panel; modal cierra, lista se actualiza y la sesión se conserva');

    await adminPage.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    dialog = adminPage.getByRole('dialog', { name: 'Crear estudiante' });
    await fill(dialog, 'ui-student@example.com', 'Estudiante duplicado');
    await dialog.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    await dialog.getByRole('alert').filter({ hasText: 'El email ya está registrado' }).waitFor();
    await adminPage.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    checks.push('Email duplicado muestra error; Escape cierra el diálogo');

    const studentPage = await browser.newPage();
    studentPage.on('pageerror', error => errors.push(error.message));
    await login(studentPage, 'ui-student@example.com');
    await studentPage.waitForURL('**/mis-asignaciones');
    await studentPage.goto(`${server.base}/students`);
    await studentPage.waitForURL('**/mis-asignaciones');
    checks.push('Cuenta creada puede entrar como estudiante y no accede al panel del personal');

    await adminPage.getByRole('button', { name: 'Editar a Estudiante de prueba UI', exact: true }).click();
    const edit = adminPage.getByRole('dialog', { name: 'Editar estudiante' });
    await edit.getByLabel(/^Nombre completo/).fill('Estudiante UI actualizado');
    await edit.getByRole('button', { name: 'Guardar', exact: true }).click();
    await edit.waitFor({ state: 'hidden' });
    await adminPage.getByRole('cell', { name: 'Estudiante UI actualizado', exact: true }).waitFor();
    await adminPage.screenshot({ path: path.join(evidence, 'crear-estudiante-panel-20261005.png'), fullPage: true, animations: 'disabled' });
    await adminPage.getByRole('button', { name: 'Editar a Estudiante UI actualizado', exact: true }).click();
    await edit.getByLabel('Estado', { exact: true }).selectOption('inactivo');
    await edit.getByRole('button', { name: 'Guardar', exact: true }).click();
    await edit.waitFor({ state: 'hidden' });
    const inactive = await browser.newPage();
    await login(inactive, 'ui-student@example.com');
    await inactive.getByRole('alert').waitFor();
    assert.equal(new URL(inactive.url()).pathname, '/login');
    checks.push('Edición y desactivación funcionan; cuenta desactivada no inicia sesión');

    const coord = await browser.newPage();
    await login(coord, 'coordinator@example.com');
    await coord.waitForURL(server.base + '/');
    await coord.getByRole('link', { name: 'Estudiantes', exact: true }).click();
    await coord.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    const coordDialog = coord.getByRole('dialog', { name: 'Crear estudiante' });
    await fill(coordDialog, 'coord-student@example.com', 'Estudiante creado por coordinador');
    await coordDialog.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    await coordDialog.waitFor({ state: 'hidden' });
    await coord.getByRole('cell', { name: 'Estudiante creado por coordinador', exact: true }).waitFor();
    checks.push('Coordinador también crea estudiantes desde su panel');

    const publicPage = await browser.newPage();
    await publicPage.goto(`${server.base}/registro-estudiante`);
    await fill(publicPage, 'public-student@example.com', 'Estudiante registro público');
    await publicPage.getByRole('button', { name: 'Crear mi perfil', exact: true }).click();
    await publicPage.getByRole('heading', { name: '¡Listo! Tu perfil está creado.' }).waitFor();
    assert.match(await publicPage.locator('.confirmation-code').innerText(), /^EST-/);
    checks.push('Regresión: registro público conserva confirmación y código del estudiante');
    await adminPage.locator('.toast').last().waitFor({ state: 'hidden' });
    await adminPage.setViewportSize({ width: 390, height: 844 });
    await adminPage.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    const mobileDialog = adminPage.getByRole('dialog', { name: 'Crear estudiante' });
    await mobileDialog.waitFor();
    await mobileDialog.getByLabel(/^Nombre completo/).click();
    await mobileDialog.getByLabel(/^Nombre completo/).fill('Prueba de formulario móvil');
    assert(await adminPage.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
    await adminPage.screenshot({ path: path.join(evidence, 'crear-estudiante-movil-20261005.png'), animations: 'disabled' });
    await adminPage.keyboard.press('Escape');
    checks.push('Formulario visible a 390 px, sin desbordamiento horizontal ni errores JavaScript');

    // Clinical workflow: all writes go through the visible UI, not API shortcuts.
    await adminPage.setViewportSize({ width: 1440, height: 1000 });
    await adminPage.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    const originForm = adminPage.getByRole('dialog', { name: 'Crear estudiante' });
    await fill(originForm, 'case-origin@example.com', 'Estudiante origen E2E');
    await originForm.getByText('Operatoria Dental', { exact: true }).click();
    await originForm.getByRole('button', { name: 'Crear estudiante', exact: true }).click();
    await originForm.waitFor({ state: 'hidden' });
    await adminPage.getByRole('cell', { name: 'Estudiante origen E2E', exact: true }).waitFor();

    await adminPage.getByRole('link', { name: 'Pacientes', exact: true }).click();
    await adminPage.getByRole('button', { name: 'Nuevo paciente', exact: true }).click();
    await adminPage.getByLabel(/^Nombre completo/).fill('Paciente clínico E2E sintético');
    await adminPage.getByLabel(/^Teléfono/).fill('900000002');
    await adminPage.getByLabel(/^Email/).fill('case-patient@example.com');
    await adminPage.getByLabel(/^Edad/).fill('34');
    await adminPage.getByLabel(/^Especialidad/).selectOption('Operatoria Dental');
    await adminPage.getByLabel('Descripción del caso', { exact: true }).fill('Paciente ficticio para verificar seguimiento y derivación');
    const patientResponse = adminPage.waitForResponse(response => response.url() === `${server.base}/api/pacientes` && response.request().method() === 'POST' && response.status() === 201);
    await adminPage.getByRole('button', { name: 'Registrar pendiente', exact: true }).click();
    const patientId = (await (await patientResponse).json()).data.id;
    await adminPage.getByRole('button', { name: 'Ver a Paciente clínico E2E sintético', exact: true }).click();
    let adminCase = adminPage.getByRole('dialog', { name: 'Detalle del caso' });
    await adminCase.getByRole('button', { name: 'Asignar estudiante', exact: true }).click();
    await adminCase.getByLabel(/^Estudiante y horario disponible/).waitFor();
    assert.match(await adminCase.getByLabel(/^Estudiante y horario disponible/).innerText(), /Estudiante origen E2E/);
    await adminCase.getByLabel(/^Motivo de la asignación manual/).fill('Asignación inicial a estudiante compatible para prueba local');
    const manualResponse = adminPage.waitForResponse(response => response.url() === `${server.base}/api/matching/manual/${patientId}` && response.request().method() === 'POST' && response.status() === 201);
    await adminCase.getByRole('button', { name: 'Confirmar asignación', exact: true }).click();
    const assignmentId = (await (await manualResponse).json()).data.assignmentId;
    await adminCase.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();

    const originPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    originPage.on('pageerror', error => errors.push(error.message));
    await login(originPage, 'case-origin@example.com');
    await originPage.waitForURL('**/mis-asignaciones');
    await originPage.getByRole('button', { name: 'Ver caso y seguimiento', exact: true }).click();
    const originCase = originPage.getByRole('dialog', { name: 'Detalle del caso' });
    await originCase.getByRole('link', { name: 'case-patient@example.com', exact: true }).waitFor();
    await originCase.getByRole('link', { name: '900000002', exact: true }).waitFor();
    const followUp = async (page, id, state, note) => {
      const caseDialog = page.getByRole('dialog', { name: 'Detalle del caso' });
      await caseDialog.getByLabel('Estado del caso', { exact: true }).selectOption(state);
      await caseDialog.getByLabel('Nueva nota de seguimiento', { exact: true }).fill(note);
      const saved = page.waitForResponse(response => response.url() === `${server.base}/api/asignaciones/${id}` && response.request().method() === 'PUT' && response.status() === 200);
      await caseDialog.getByRole('button', { name: 'Guardar seguimiento', exact: true }).click();
      await saved;
      await caseDialog.locator('.case-history').getByText(note, { exact: true }).waitFor();
      assert.equal(await caseDialog.getByLabel('Estado del caso', { exact: true }).inputValue(), state);
    };
    await followUp(originPage, assignmentId, 'contactado', 'Revisé el caso y contacté al paciente sintético');
    await originCase.getByRole('button', { name: 'Registrar derivación', exact: true }).click();
    await originCase.getByLabel(/^Especialidad de destino/).selectOption('Endodoncia');
    await originCase.getByLabel(/^Prioridad/).selectOption('Alta');
    await originCase.getByLabel(/^Tratamiento que necesita/).fill('Evaluación endodóntica tras revisar el caso');
    await originCase.getByLabel(/^Motivo de la clasificación o derivación/).fill('Tras el contacto se propone evaluación por endodoncia');
    const proposalResponse = originPage.waitForResponse(response => response.url() === `${server.base}/api/asignaciones/${assignmentId}/derivacion` && response.request().method() === 'POST' && response.status() === 201);
    await originCase.getByRole('button', { name: 'Guardar propuesta', exact: true }).click();
    const referralId = (await (await proposalResponse).json()).data.id;
    await originCase.getByRole('heading', { name: 'Derivación pendiente de revisión', exact: true }).waitFor();
    await originCase.evaluate(element => { element.scrollTop = 0; });
    await originCase.screenshot({ path: path.join(evidence, 'caso-e2e-derivacion-local-20261005.png'), animations: 'disabled' });

    await adminPage.getByRole('link', { name: 'Derivaciones', exact: true }).click();
    const referralRow = adminPage.getByRole('row').filter({ hasText: 'Paciente clínico E2E sintético' });
    await referralRow.getByRole('button', { name: 'Ver caso y revisar', exact: true }).click();
    adminCase = adminPage.getByRole('dialog', { name: 'Detalle del caso' });
    await adminCase.getByRole('button', { name: 'Revisar derivación', exact: true }).click();
    await adminCase.getByLabel('Decisión', { exact: true }).selectOption('aprobada');
    await adminCase.getByLabel(/^Motivo de la revisión/).fill('El administrador confirma el tratamiento después de revisar la propuesta');
    const approvedResponse = adminPage.waitForResponse(response => response.url() === `${server.base}/api/derivaciones/${referralId}/revision` && response.request().method() === 'POST' && response.status() === 200);
    await adminCase.getByRole('button', { name: 'Guardar revisión', exact: true }).click();
    const approved = (await (await approvedResponse).json()).data;
    assert(approved.matching.success, 'La derivación aprobada debe tener receptor');
    const destinationId = approved.matching.assignmentId;
    const receiverEmail = {
      'Estudiante creado por coordinador': 'coord-student@example.com',
      'Estudiante registro público': 'public-student@example.com',
    }[approved.matching.estudiante];
    assert(receiverEmail, 'El receptor debe ser compatible y distinto al origen');

    const receiverPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    receiverPage.on('pageerror', error => errors.push(error.message));
    await login(receiverPage, receiverEmail);
    await receiverPage.waitForURL('**/mis-asignaciones');
    await receiverPage.getByRole('button', { name: 'Ver caso y seguimiento', exact: true }).click();
    const receiverCase = receiverPage.getByRole('dialog', { name: 'Detalle del caso' });
    await receiverCase.getByRole('link', { name: 'case-patient@example.com', exact: true }).waitFor();
    await receiverCase.getByRole('heading', { name: 'Clasificación revisada por el personal', exact: true }).waitFor();
    await followUp(receiverPage, destinationId, 'contactado', 'Receptor contactó al paciente derivado');
    await followUp(receiverPage, destinationId, 'en_tratamiento', 'Receptor inició el tratamiento de prueba');
    await followUp(receiverPage, destinationId, 'completado', 'Tratamiento del caso E2E completado');
    await receiverCase.evaluate(element => { element.scrollTop = 0; });
    await receiverCase.screenshot({ path: path.join(evidence, 'caso-e2e-completado-local-20261005.png'), animations: 'disabled' });

    const finalRows = await server.database.executeQuery('SELECT estado FROM asignaciones WHERE id_paciente=$1 ORDER BY id', [patientId]);
    assert.deepEqual(finalRows.rows.map(row => row.estado), ['derivado', 'completado']);
    const loads = await server.database.executeQuery('SELECT casos_activos FROM estudiantes_odontologia');
    assert(loads.rows.every(row => row.casos_activos === 0));
    checks.push('E2E clínico completo por interfaz: admin crea/asigna paciente → estudiante revisa contacto y deriva → admin aprueba → receptor contacta, trata y completa; historial y cupos confirmados en PostgreSQL');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'passed', environment: 'local Chromium + PostgreSQL synthetic', checks, uat: 'Escenarios simulados; pendiente aceptación humana' }, null, 2));
  } catch (error) {
    if (adminPage) {
      console.error('Browser state:', await adminPage.locator('body').innerText());
      console.error('JavaScript errors:', errors);
      await adminPage.screenshot({ path: path.join(evidence, 'browser-failure.png'), fullPage: true });
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
