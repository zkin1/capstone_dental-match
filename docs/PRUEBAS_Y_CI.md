# Pruebas y CI — Dental Match Capstone

Corte: 05-10-2026. Las pruebas usan PostgreSQL local y datos sintéticos en un esquema temporal propio. Cada ejecución elimina su esquema al terminar. No se envían correos reales ni se llama a un LLM externo.

## Cambios de este avance

- DMC-002: arquitectura documentada con PostgreSQL, `pg`, esquema, migraciones, transacciones e historial.
- DMC-015: admin y coordinador crean estudiantes dentro del panel mediante `POST /api/estudiantes`. Se reutilizan el formulario y el servicio del registro público. El alta crea perfil, especialidades, horarios y cuenta de rol `student` en una transacción; la sesión del personal se conserva.
- DMC-034: `.github/workflows/ci.yml` ejecuta instalación desde lockfiles, lint, migraciones, pruebas/cobertura, build, sistema, navegador y auditoría al recibir un push o pull request.
- Se rechazan tipos, longitudes, horarios y capacidades inválidos en el alta de estudiante. Un cuerpo mayor a 1 MB responde 413.
- React Router y dependencias compatibles del cliente se actualizaron durante la revisión de seguridad. No se aplicaron actualizaciones forzadas de versión mayor.

## Tipos de pruebas solicitados

| Tipo | Alcance ejecutado | Resultado / evidencia |
|---|---|---|
| Unitarias | Auth, permisos, matching, derivaciones, timeout/fallback, correo y errores | Aprobadas: 58/58; `tests/unit/` y evidencia Jest |
| Integración | Contrato HTTP y PostgreSQL real: migraciones, roles, historial, cupos, derivación, notificaciones y alta de estudiante | Aprobadas: 31/31, incluidas 19 PostgreSQL y 12 de contrato HTTP; `tests/integration/` |
| Sistema | HTTP real + PostgreSQL: login, alta de estudiantes, intake con fallback, asignación, derivación, aprobación, tratamiento y cierre | Aprobado: `npm run test:system`; cupos e historial verificados al finalizar; recorrido clínico también probado por interfaz |
| Aceptación (UAT) | Casos del personal, estudiante y público recorridos en navegador con datos ficticios | Escenarios técnicos aprobados: nueve automatizados y 19 exploratorios por agente. Aceptación humana pendiente en la tabla UAT |
| Regresión | Suite anterior, siete pruebas del cliente y registro público después de reutilizar el formulario | Aprobada: 89/89 Jest, 7/7 del cliente y 9/9 de navegador; lint y build también pasan |
| Rendimiento | Consultas de dashboard, pacientes, estudiantes, asignaciones y pendientes con 100 pacientes de carga y un caso completado | Aprobado localmente: 30 consultas a concurrencia 1 y 100 a concurrencia 10; p95 15/58 ms, bajo el umbral de 3 segundos |
| Seguridad | 401/403, protección de rol, duplicados, validaciones, SQL inválido, body/JSON, cookies HttpOnly/SameSite, logout, cabeceras y rate limit | Casos técnicos aprobados; auditoría de dependencias de producción con cero avisos. Hardening/privacidad y avisos de herramientas de desarrollo siguen pendientes en DMC-032 |
| Estrés | 250 consultas a concurrencia 50 con pool de 8 conexiones; health posterior. Concurrencia de asignaciones/revisiones se verifica en integración | Aprobado localmente: cero errores, p95 195 ms y recuperación saludable; petición 501 de otro contador devuelve 429 |

### Resultado frente a la foto de la profesora

Se ejecutaron todas las categorías indicadas. Las siete categorías técnicas de la tabla tienen resultados aprobados en el alcance documentado. Los escenarios UAT también funcionaron al ser recorridos por el agente, pero la **aceptación del usuario** sigue pendiente: Carlos Avello debe registrar si acepta los casos, con fecha y observaciones. Por eso aún no se declara completa la aprobación UAT.

El backlog registra **30 historias completadas y seis en progreso**. DMC-031 y el piloto técnico local de DMC-036 están completados; el CI de DMC-034 ya está implementado, pero necesita su primera ejecución remota y el check obligatorio para cumplir el objetivo de bloquear merges incorrectos. Las pruebas locales no confirman el envío real de correo, el análisis con proveedor IA ni la capacidad en producción.

La cobertura configurada mide el núcleo seleccionado en `jest.config.js`, con umbral global de 80%; no representa la totalidad del repositorio. El rendimiento es una medición acotada de este PC y de consultas de lectura; no demuestra la capacidad máxima ni el comportamiento en producción. La seguridad comprobada corresponde a los casos de la tabla y a los avisos de dependencias conocidos en este corte.

## Resultados registrados

Entorno local: Node 22.18.0, npm 10.8.2, PostgreSQL 18.6 y Chromium headless. Se comprobó la instalación de ambos lockfiles, lint backend/cliente y build. La suite Jest terminó con **89/89**, sin omisiones: 58 unitarias y 31 de integración, de las cuales 19 usan PostgreSQL real. Las siete pruebas del cliente y los nueve escenarios de navegador también pasaron.

Cobertura del núcleo seleccionado: 93.75% statements, 88.51% branches, 92% functions y 97% lines. Auditoría de dependencias de producción: cero avisos en backend y cliente. La auditoría completa del cliente también terminó sin avisos; la del backend conserva 30 avisos altos en herramientas de desarrollo.

| Concurrencia | Peticiones | Errores | p95 | Máximo | Peticiones/segundo |
|---:|---:|---:|---:|---:|---:|
| 1 | 30 | 0 | 15 ms | 144 ms | 102 |
| 10 | 100 | 0 | 58 ms | 231 ms | 267 |
| 50 | 250 | 0 | 195 ms | 244 ms | 360 |

Evidencias: [Jest y cobertura](evidencias/pruebas-jest-20261005.json), [sistema/seguridad/carga](evidencias/pruebas-sistema-20261005.json), [navegador](evidencias/pruebas-navegador-20261005.json), auditorías [backend](evidencias/auditoria-backend-20261005.json) y [cliente](evidencias/auditoria-client-20261005.json). Capturas del [formulario](evidencias/crear-estudiante-formulario-20261005.png), [panel](evidencias/crear-estudiante-panel-20261005.png), [móvil](evidencias/crear-estudiante-movil-20261005.png), [derivación del caso E2E](evidencias/caso-e2e-derivacion-local-20261005.png) y [tratamiento completado](evidencias/caso-e2e-completado-local-20261005.png).

La última ejecución E2E recorrió el caso clínico mediante clics y formularios: administrador crea y asigna al paciente, estudiante consulta contacto y registra derivación, administrador aprueba y receptor contacta, inicia y completa el tratamiento. Se comprobaron las respuestas HTTP, las notas del historial y los estados finales `derivado` y `completado` en PostgreSQL, con los cupos liberados. Se usaron cuentas y pacientes ficticios en un esquema temporal local. No hubo errores JavaScript durante los nueve escenarios.

Además, a petición del usuario un agente realizó un [recorrido exploratorio interactivo](E2E_EXPLORATORIO_LOCAL.md) en el navegador integrado, decidiendo los pasos a partir de cada pantalla. Recorrió administrador, coordinador, estudiante, registro público y vista móvil, con recargas para comprobar persistencia. El caso clínico terminó en completado; se probaron la falta de receptor y el reintento después de liberar un horario. Se corrigió el nombre visible de la portada y el registro de pacientes a Dental Match y se volvió a comprobar en pantalla. Quedan dos observaciones de claridad: diferenciar cupo total de cupo por horario y explicar que cancelar una asignación devuelve el paciente a pendiente. El envío real de correo sigue fuera del alcance del entorno sin proveedor.

## Aceptación del usuario

| Caso | Acción y resultado esperado | Validación técnica | Aceptación humana |
|---|---|---|---|
| UAT-01 | Admin abre Crear estudiante, completa los campos y guarda; ve código/perfil en la lista y mantiene su sesión | Automatizada en navegador | Pendiente |
| UAT-02 | Contraseñas diferentes y email repetido muestran un error; no se crea una cuenta parcial | Navegador + PostgreSQL | Pendiente |
| UAT-03 | Coordinador crea un estudiante desde su panel | Automatizada en navegador | Pendiente |
| UAT-04 | Estudiante creado inicia sesión y solo accede a sus asignaciones | Navegador + permisos HTTP | Pendiente |
| UAT-05 | Personal edita o desactiva un estudiante sin casos activos; una cuenta inactiva no inicia sesión | Navegador + PostgreSQL | Pendiente |
| UAT-06 | Admin crea y asigna paciente; estudiante revisa contacto, registra contacto/nota y propone derivación; admin revisa y aprueba; receptor contacta, inicia y termina tratamiento | Navegador + sistema HTTP + PostgreSQL | Pendiente |
| UAT-07 | Registro público conserva confirmación/código; formulario del panel funciona en pantalla de 390 px | Automatizada en navegador | Pendiente |

Carlos Avello debe recorrer los casos y registrar aceptación, fecha y observaciones. Ejecutar estos escenarios con un agente demuestra comportamiento técnico; no sustituye esa aprobación.

## Repetir localmente

Usar Node 22 y PostgreSQL local. Definir una URL de una base de prueba; el usuario necesita permiso para crear/eliminar el esquema temporal. La URL se mantiene fuera de Git:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USUARIO:CONTRASENA@127.0.0.1:5432/BASE_PRUEBAS'
npm ci
npm --prefix client ci
npm run lint
npm --prefix client run lint
npm run test:coverage -- --runInBand
npm --prefix client test
npm --prefix client run build
npx playwright install chromium --only-shell
npm run test:system
npm run test:browser
npm audit --omit=dev
npm --prefix client audit --omit=dev
```

Las pruebas PostgreSQL de Jest se omiten si falta `TEST_DATABASE_URL`. Los comandos `test:system`, `test:browser` y `test:postgres` fallan explícitamente si falta una URL local válida. CI siempre define la URL y usa PostgreSQL 18, por lo que ejecuta las pruebas reales de base de datos.

## Activar el bloqueo antes de integrar cambios

El workflow crea el check **quality**. Se apoya en las acciones oficiales [checkout](https://github.com/actions/checkout) y [setup-node](https://github.com/actions/setup-node), usa permisos de lectura y no necesita credenciales de producción.

Después de publicar este commit, comprobar la primera ejecución en GitHub → Actions. En Settings → Rules → Rulesets (o Branches), proteger la rama de integración, exigir pull request y añadir el check `quality` como requisito. La existencia del workflow por sí sola no obliga a esperar el resultado; esa regla de GitHub completa el bloqueo de merges. Esta configuración remota y la primera ejecución quedan pendientes hasta publicar el commit.

CI valida las migraciones en su base temporal y comprueba que una segunda ejecución no agrega cambios. El despliegue de Vercel continúa con el flujo existente del proyecto; las migraciones de producción se gestionan por separado.

## Límites pendientes

- UAT humana y un piloto completo en el entorno desplegado.
- Correo real, llamada real al LLM, auditoría completa de accesibilidad, backup/restauración y controles formales de privacidad.
- La auditoría de producción del backend y del cliente debe pasar sin avisos. La auditoría completa del backend conserva avisos en dependencias de desarrollo de Jest/nodemon asociados a `braces`; no hay una corrección compatible propuesta por npm en este corte. No se usó `audit fix --force`. Registrar seguimiento en DMC-032.
