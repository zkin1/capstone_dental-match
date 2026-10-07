# Evaluación 2: cumplimiento y demostración de pruebas

Revisión: 06-10-2026. Referencia: foto de la profesora, que solicita un avance del 60 % para el 14 de octubre y pruebas unitarias, integración, sistema, aceptación (UAT), regresión, rendimiento, seguridad y estrés. La foto no incluye una rúbrica detallada ni define cómo calcular el avance.

## Evaluación del cumplimiento

El proyecto tiene evidencia para presentar un avance superior al 60 % según su backlog. Las siete categorías técnicas tienen pruebas ejecutadas y resultados aprobados en el alcance local descrito. La aceptación UAT sigue pendiente de una persona; los escenarios automatizados no acreditan por sí solos aceptación humana.

El [backlog](../Backlog/JIRA_BACKLOG_18_SEMANAS.md) registra 30 de 36 historias completadas: **83,3 % por cantidad**. Las historias completadas suman 193 de 238 puntos: **81,1 % por puntos**, sin dar crédito parcial a las seis historias en progreso. Son indicadores de la planificación del repositorio, sujetos a sus criterios de aceptación; no equivalen al porcentaje ni a la nota que determine la profesora. La cobertura de código es otra medida y no representa el avance del proyecto.

| Requisito | Evidencia disponible | Evaluación |
|---|---|---|
| Unitarias | 58/58 aprobadas: autenticación, permisos, matching, derivaciones, correo simulado y errores | Cubierto |
| Integración | 31/31 aprobadas; 19 usan PostgreSQL real y 12 verifican contratos HTTP | Cubierto |
| Sistema | Caso completo por HTTP y PostgreSQL: alta, asignación, contacto, derivación, aprobación, tratamiento y cierre | Cubierto localmente |
| Aceptación UAT | Nueve escenarios automatizados de navegador y siete casos preparados para aceptación humana | Pendiente de aceptación humana |
| Regresión | Nueva ejecución de las 89 pruebas backend, siete del cliente y nueve escenarios de navegador | Cubierto en las suites existentes |
| Rendimiento | 30 consultas a concurrencia 1 y 100 a concurrencia 10; p95 de 22 y 90 ms | Cubierto localmente |
| Seguridad | 401/403, roles, entradas inválidas, cookies, logout, cabeceras, límite de body y rate limit | Cubierto para estos controles; no es una auditoría integral |
| Estrés | 250 consultas a concurrencia 50, cero errores, p95 388 ms y health posterior correcto | Prueba local básica de carga alta; no determina el límite máximo ni la capacidad de producción |

Estas suites y evidencias completas corresponden a **Capstone**. Se consultó `dental_matching_IA` como referencia del producto: su copia local todavía no incluye todas las suites de seguimiento, sistema y navegador agregadas aquí. Para esta demostración, ejecutar Capstone y presentar su commit, sus pruebas y sus evidencias. Esta revisión no modificó el repositorio principal.

## Resultados comprobados el 6 de octubre

- [Jest: resultado completo generado por la ejecución](evidencias/pruebas-jest-20261006-raw.json): 10 suites, 89 aprobadas, cero fallidas y cero omitidas.
- [Resumen de Jest y cobertura](evidencias/pruebas-jest-20261006.json): 58 unitarias, 31 de integración; cobertura de statements 93,75 %, branches 87,16 %, functions 92 % y lines 97 % en los módulos seleccionados por `jest.config.js`.
- Cliente: `npm --prefix client test` terminó con siete aprobadas, cero fallidas y cero omitidas. `npm --prefix client run build` terminó correctamente.
- [Sistema, seguridad, rendimiento y estrés](evidencias/pruebas-sistema-20261006.json): `status: passed` y cero errores en las tres cargas.
- [Navegador](evidencias/pruebas-navegador-20261006.json): nueve escenarios aprobados; conserva la advertencia de aceptación humana pendiente.
- Capturas nuevas: [alta de estudiante](evidencias/crear-estudiante-formulario-20261006.png), [lista actualizada](evidencias/crear-estudiante-panel-20261006.png), [móvil](evidencias/crear-estudiante-movil-20261006.png), [derivación](evidencias/caso-e2e-derivacion-local-20261006.png) y [caso completado](evidencias/caso-e2e-completado-local-20261006.png).

El entorno fue Node 22.18.0, npm 10.8.2, PostgreSQL local y Chromium. Los scripts crean y eliminan esquemas temporales con datos ficticios. Se probó el fallback de IA y el correo simulado; estos resultados no acreditan análisis con un proveedor IA ni entrega real de correo.

## Preparación antes de la clase

Abrir PowerShell en el repositorio:

```powershell
Set-Location 'C:\Users\zkn\Documents\GitHub\capstone_dental-match'
```

Preparar dependencias y Chromium con anticipación, si faltan:

```powershell
npm ci
npm --prefix client ci
npx playwright install chromium
```

Definir `TEST_DATABASE_URL` con una conexión PostgreSQL **local** válida, antes de empezar la grabación o compartir pantalla. La siguiente línea es una plantilla; sustituir los marcadores con la configuración de la base de pruebas y mantener la contraseña fuera de la entrega:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/BASE_PRUEBAS'
```

En esta revisión se usó la conexión local definida por las variables `DB_*` de `.env`, pasada a los procesos como `TEST_DATABASE_URL`. El usuario de PostgreSQL necesita permiso para crear y eliminar el esquema temporal. Sin `TEST_DATABASE_URL`, Jest omite las 19 pruebas PostgreSQL: ese resultado no demuestra la integración completa. Sistema y navegador requieren la URL y fallan si no está disponible.

## Demostración en vivo: aproximadamente 10 minutos

1. Mostrar el backlog y explicar qué está completado y qué continúa en progreso. Usar el 81,1 % por puntos como indicador del avance planificado.
2. Ejecutar las pruebas y mostrar la salida real de la terminal. En Jest se ven los archivos `tests/unit` y `tests/integration`; explicar que el total de 89 incluye ambas categorías. Reejecutar la suite y el registro público demuestra la regresión cubierta.
3. Mostrar el reporte de sistema: checks de seguridad, métricas de carga y recuperación. Explicar que p95 de 388 ms significa que el 95 % de las consultas medidas terminó en ese tiempo o menos, por debajo del umbral configurado de 3 segundos.
4. Mostrar las capturas del navegador y recorrer manualmente el caso del paciente con administrador y estudiante. Registrar esa sesión como UAT solo cuando una persona evalúe y acepte los casos.
5. Cerrar mostrando resultados, pendientes y evidencias guardadas.

Comandos para el bloque técnico, en orden:

```powershell
git rev-parse --short HEAD
git status --short
npm run test:coverage -- --runInBand --json --outputFile=docs/evidencias/demo-jest.json
npm --prefix client test
npm --prefix client run build
npm run test:system
npm run test:browser
```

Después de cada comando, comprobar `$LASTEXITCODE`: **0** significa que terminó correctamente. En la salida de Jest deben aparecer **89 passed** y **10 passed** suites, sin pruebas omitidas; el JSON debe indicar `numFailedTests: 0`, `numPendingTests: 0` y `success: true`. En cliente deben verse **pass 7**, **fail 0** y **skipped 0**. Sistema y navegador deben terminar con **`status: passed`**; el navegador lista nueve escenarios.

Si la profesora quiere ver las categorías de Jest por separado, se pueden ejecutar además:

```powershell
npm run test:unit -- --runInBand
npm run test:integration -- --runInBand
```

Los resultados esperados son 58 y 31 aprobadas, respectivamente. La carpeta `coverage/lcov-report/index.html` permite mostrar visualmente la cobertura de los módulos seleccionados; no usar ese porcentaje como porcentaje de avance.

El script de navegador funciona en modo headless: comprueba la interfaz sin abrir una ventana visible y genera capturas. Para enseñar interacción visible, recorrer la aplicación manualmente con cuentas ficticias en el entorno preparado. Los nombres PNG del script conservan una fecha fija de octubre 5; al archivar una nueva demostración, guardar copias con la fecha real y acompañarlas con el resultado de esa ejecución. Las capturas enlazadas arriba se archivaron por separado el 6 de octubre.

Los avisos de fallback IA durante estas pruebas son esperados: se comprueba que el flujo siga funcionando cuando el proveedor no responde. El aviso de tamaño del bundle durante el build no impidió la compilación comprobada.

## Completar la aceptación UAT

Usar los siete casos de la [tabla de aceptación](PRUEBAS_Y_CI.md#aceptación-del-usuario). Una persona que represente al usuario debe recorrerlos y registrar, por cada caso:

- Persona y rol que valida, fecha, versión/commit y entorno.
- Acción realizada, resultado esperado y resultado observado.
- Aceptado o rechazado y observaciones; evidencia o incidencia si corresponde.

El recorrido principal es: personal crea estudiante y paciente → asigna el caso → estudiante consulta contacto y propone derivación → personal aprueba → receptor contacta, inicia tratamiento y completa → personal comprueba historial y cupos liberados. Incluir también contraseña diferente, email repetido, restricciones de rol, desactivación y registro público/móvil.

Mantener la aceptación humana como pendiente hasta obtener ese registro. El informe actual identifica a Carlos Avello como responsable de registrar la aceptación; si valida otra persona, identificarla y describir su rol.

## Qué entregar

Entregar esta matriz, el backlog, los resultados JSON, capturas y el registro UAT cuando exista. Adjuntar una grabación breve de la ejecución de los comandos con sus resúmenes y un recorrido funcional. Mostrar tanto los casos correctos como los rechazos esperados: por ejemplo, una entrada inválida que devuelve 400 o una acción sin permiso que devuelve 403 representa una prueba aprobada cuando ese es el resultado esperado.

El CI remoto continúa sin una ejecución aprobada: GitHub no asignó un runner y no ejecutó pasos. Presentar esa [incidencia documentada](PRUEBAS_Y_CI.md#actualización-del-ci-remoto--06-10-2026) junto a los resultados locales. La foto de la profesora no exige CI, pero el bloqueo de merges de DMC-034 sigue pendiente dentro del alcance del proyecto.
