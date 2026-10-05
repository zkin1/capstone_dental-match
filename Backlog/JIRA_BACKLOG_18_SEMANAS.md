# DentalMatch Capstone — backlog Jira y plan de hitos

## 1. Propósito del documento

Este documento convierte el proyecto actual en un backlog académico y operativo para **18 semanas**. Está redactado para poder copiarse al repositorio destino `DentalMatch Capstone` y luego cargarse en Jira.

La planificación original asume **9 sprints de 2 semanas**, con revisión y demostración al cierre de cada sprint. La tabla de historias conserva una propuesta de estado al corte del 05-10-2026; esos estados son del repositorio, no se sincronizan con Jira. El repo ya contiene una implementación base copiada de `dental_matching_IA`, pero el historial de Capstone no demuestra que se haya construido en 9 sprints.

Este Markdown es la fuente vigente de estados y evidencias. `Backlog/DentalMatch_Capstone_Backlog_Jira.docx` conserva la planificación inicial de septiembre; sus estados no representan este corte. La copia Word no se regeneró porque el entorno no dispone del renderizador necesario para verificarla visualmente.

## 2. Visión del producto

DentalMatch conectará casos de pacientes odontológicos con estudiantes de odontología clínica que tengan especialidad, disponibilidad y capacidad. El paciente registrará su caso y aceptará el uso de sus datos; el sistema pre-categorizará sus respuestas como apoyo de triaje, filtrará candidatos elegibles y ejecutará un matching ponderado, trazable y transaccional. El resultado no será un diagnóstico: la evaluación clínica definitiva corresponderá al equipo odontológico.

### Usuarios

| Usuario | Necesidad principal | Superficie |
|---|---|---|
| Paciente | Registrar un caso claro, recibir número de caso y saber si queda asignado o pendiente | Landing e intake público |
| Estudiante | Registrar especialidad, horario y capacidad; revisar sus casos y avanzar su estado | Registro público y “Mis asignaciones” |
| Coordinador | Gestionar pacientes, estudiantes, matching, asignaciones y notificaciones | Panel autenticado |
| Administrador | Administrar cuentas, roles y operación completa | Panel autenticado |

### Alcance funcional

- Landing y navegación pública en español.
- Registro público de paciente con consentimiento explícito y cuestionario clínico dinámico.
- Pre-categorización opcional con agente IA y fallback determinista.
- Registro de estudiantes con especialidades, clínica, días, horarios y capacidad.
- Login, refresh token rotativo, logout, cookies HttpOnly y permisos por rol.
- Matching determinista con filtros duros, pesos, score y factores auditables.
- Asignaciones con estados `asignado`, `notificado`, `contactado`, `en_tratamiento`, `completado` y `cancelado`.
- Dashboard, cola de pacientes pendientes, gestión de pacientes/estudiantes y notificaciones tipo outbox.
- API Express, PostgreSQL, migraciones reproducibles, Docker, pruebas unitarias e integración y frontend React/Vite.

### Fuera de alcance de la demo

- Diagnóstico médico automático.
- Selección de estudiantes por un LLM.
- Historia clínica completa o ficha clínica legal.
- Pago, agenda clínica institucional o videollamada.
- Entrega real de correo hasta completar configuración y verificación del worker y del proveedor; el código del envío ya está implementado.

## 3. Épicas de Jira

| Código | Épica | Resultado esperado | Evidencia principal en el repo |
|---|---|---|---|
| DMC-EP01 | Plataforma, arquitectura y datos | Base ejecutable, modular, hexagonal y persistencia PostgreSQL reproducible | `package.json`, `server.js`, `src/infrastructure/`, `src/domain/`, `src/infrastructure/database/migrations/` |
| DMC-EP02 | Usuarios, autenticación y autorización | Sesiones seguras y acceso correcto para admin, coordinador y estudiante | `src/application/auth/`, `src/adapters/inbound/http/controllers/auth.controller.js`, `src/adapters/inbound/http/middleware/auth.js` |
| DMC-EP03 | Paciente, intake y triaje | Caso público validado, consentido, categorizado y confirmado | `client/src/pages/RegistroPaciente.jsx`, `src/application/patients/`, `src/domain/patients/` |
| DMC-EP04 | Estudiantes, disponibilidad y capacidad | Perfil elegible para matching con horarios y carga verificables | `client/src/pages/RegistroEstudiante.jsx`, `src/application/students/`, `src/domain/students/` |
| DMC-EP05 | Matching explicable e IA auxiliar | Candidato compatible elegido por reglas deterministas y score auditable | `src/domain/matching/scoring.js`, `src/application/matching/`, `src/adapters/outbound/ai/` |
| DMC-EP06 | Asignaciones y seguimiento | Ciclo de vida completo de una asignación sin estados inválidos | `src/domain/assignments/`, `src/application/assignments/`, `client/src/pages/Assignments.jsx`, `client/src/pages/MisAsignaciones.jsx` |
| DMC-EP07 | Operación, dashboard y notificaciones | Equipo coordinador puede operar la cola y consultar métricas/outbox | `client/src/pages/Dashboard.jsx`, `Matching.jsx`, `Notifications.jsx`, `src/application/dashboard/`, `src/application/notifications/` |
| DMC-EP08 | Frontend, seguridad, calidad y release | Experiencia accesible, pruebas y despliegue reproducible | `client/src/components/`, `client/src/styles/`, `tests/`, `Dockerfile`, `docker-compose.yml` |

## 4. Hitos de las 18 semanas

| Hito | Semana | Incremento demostrable | Criterio de salida |
|---|---:|---|---|
| H1 — Base del producto | 2 | Backend arranca, migraciones crean el esquema y la arquitectura queda documentada | `npm ci`, `npm run migrate:status` y `GET /api/health` funcionan |
| H2 — Acceso y roles | 4 | Login y rutas protegidas con admin, coordinador y estudiante | Sesión por cookie; un rol no puede abrir pantallas ajenas |
| H3 — Alta de usuarios operativos | 6 | Paciente y estudiante pueden registrarse con validaciones | Se persisten consentimiento, respuestas, especialidades, horarios y capacidad |
| H4 — Matching MVP | 8 | Un caso elegible obtiene candidato o queda pendiente | Score reproducible, factores visibles y capacidad protegida por transacción |
| H5 — Seguimiento operativo | 10 | Coordinador y estudiante gestionan el ciclo de una asignación | Solo transiciones válidas; carga se libera al completar/cancelar |
| H6 — Centro de operación | 12 | Dashboard, pendientes y notificaciones outbox disponibles | Métricas consistentes y eventos de asignación registrados |
| H7 — IA auxiliar y UX final | 14 | IA pre-categoriza sin bloquear el flujo y la interfaz es responsive | Fallback determinista ante timeout/error; errores y loading recuperables |
| H8 — Calidad y preparación de entrega | 16 | Pruebas, seguridad y despliegue reproducible | Tests, lint, build, Docker y revisión de secretos pasan |
| H9 — Cierre Capstone | 18 | Demo end-to-end, documentación y backlog cerrado | Caso desde intake hasta estado final, evidencia de pruebas y manual de operación |

## 5. Calendario por sprint

| Sprint | Semanas | Épicas | Trabajo principal | Entregable del sprint |
|---|---:|---|---|---|
| S01 | 1–2 | EP01 | Alcance, arquitectura, API base, conexión y migraciones | H1: repositorio base ejecutable y esquema PostgreSQL |
| S02 | 3–4 | EP02, EP08 | Auth, cookies, roles, errores, límites y estructura de navegación | H2: acceso seguro por rol |
| S03 | 5–6 | EP03 | Landing, intake, consentimiento, cuestionario y confirmación | H3: caso de paciente registrado |
| S04 | 7–8 | EP04 | Registro de estudiante, especialidades, horarios y capacidad; CRUD staff | H3: candidato elegible persistido |
| S05 | 9–10 | EP05 | Categorización, pesos, filtros, explicación y matching automático | H4: primer matching reproducible |
| S06 | 11–12 | EP06 | Estados, permisos, “Mis asignaciones”, cancelación y carga | H5: seguimiento end-to-end |
| S07 | 13–14 | EP07, EP05 | Dashboard, pendientes, outbox y agente IA | H6/H7: operación e IA auxiliar |
| S08 | 15–16 | EP08 | Accesibilidad, pruebas, Docker, rate limits y revisión de seguridad | H8: release candidate |
| S09 | 17–18 | Todas | Worker de correo, CI, backup, pruebas E2E, manual y presentación | H9: entrega Capstone |

## 6. Product backlog detallado

Los criterios de aceptación están escritos como condiciones verificables para Jira. El estado de la tabla se basa en el código y las evidencias disponibles al 05-10-2026, incluido el recorrido exploratorio de un agente por la página local. **Completado** indica que el alcance de la historia está cubierto; **En progreso** indica que existe trabajo comprobado y quedan criterios pendientes. Las casillas de finalización reflejan ese mismo estado. Este archivo no actualiza el tablero remoto de Jira ni sustituye la aceptación humana del producto.

| ID | Tipo | Resumen Jira | Historia de usuario / objetivo | Criterios de aceptación | SP | Prioridad | Sprint | Estado sugerido al 05-10-2026 | Entregable / evidencia |
|---|---|---|---|---|---:|---|---|---|---|
| DMC-001 | Task | Definir visión, actores y alcance | Como equipo, necesito acordar qué problema resuelve DentalMatch y qué no resuelve | Se documentan usuarios, propósito, límites, riesgos y criterios de éxito; no se promete diagnóstico | 3 | Media | S01 | Completado | `docs/PRODUCT.md`, `README.md` |
| DMC-002 | Task | Montar monolito modular hexagonal | Como desarrollador, necesito separar dominio, aplicación, adaptadores e infraestructura | Las rutas no contienen SQL ni reglas; los casos de uso coordinan y los repositorios persisten | 5 | Alta | S01 | Completado | `docs/ARCHITECTURE.md`, `src/domain/`, `src/application/`, `src/adapters/`, `src/infrastructure/` |
| DMC-003 | Story | Crear esquema PostgreSQL reproducible | Como equipo, necesito levantar la base sin editar SQL manualmente | Las migraciones crean usuarios, estudiantes, especialidades, pacientes, asignaciones, notificaciones y control de versiones; se aplican desde una base limpia | 8 | Crítica | S01 | Completado | `src/infrastructure/database/migrations/20260922000001_postgresql_baseline.js`, `20261003000001_case_followup_and_referrals.js` y `scripts/migrate.js` |
| DMC-004 | Task | Preparar ejecución local y Docker | Como integrante del equipo, necesito instalar y ejecutar el proyecto de forma repetible | `npm ci`, `npm --prefix client ci` y `docker compose config --quiet` funcionan; secretos solo salen de `.env` | 5 | Alta | S01 | Completado | `package.json`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `scripts/migrate.js` |
| DMC-005 | Story | Iniciar sesión y cerrar sesión | Como usuario operativo, quiero entrar con email/contraseña y cerrar mi sesión | Credenciales correctas crean cookies HttpOnly; credenciales inválidas no revelan información sensible; logout invalida refresh | 5 | Crítica | S02 | Completado | `src/application/auth/auth.service.js`, `src/adapters/inbound/http/controllers/auth.controller.js` |
| DMC-006 | Story | Renovar sesión con refresh token rotativo | Como usuario, quiero mantener mi sesión sin guardar tokens en localStorage | El refresh token original no se persiste en claro; una renovación rota el hash y una sesión inválida devuelve 401 | 5 | Alta | S02 | Completado | `src/adapters/outbound/security/jwt.adapter.js`, `src/adapters/outbound/persistence/postgres/auth.repository.js`, `tests/unit/authService.test.js` |
| DMC-007 | Story | Aplicar roles y permisos mínimos | Como administrador, necesito que cada rol vea solo lo que le corresponde | Admin/coordinador operan; estudiante solo ve sus asignaciones; rutas ajenas responden 401/403 y redirigen en frontend | 5 | Alta | S02 | Completado | `src/adapters/inbound/http/middleware/auth.js`, `client/src/App.jsx`, pruebas de auth |
| DMC-008 | Task | Centralizar errores y protecciones HTTP | Como equipo, necesito respuestas seguras y consistentes ante errores | Existe request id, límite de body, rate limit, Helmet, compresión, 404 y error handler; producción no expone stack | 5 | Media | S02 | Completado | `src/infrastructure/http/app.js`, `src/adapters/inbound/http/middleware/errorHandler.js` |
| DMC-009 | Story | Publicar landing y rutas públicas | Como visitante, quiero entender el servicio y elegir paciente o estudiante | `/landing`, `/registro-paciente`, `/registro-estudiante` y `/login` son navegables; copy en español; sin testimonios inventados | 3 | Media | S03 | Completado | `client/src/pages/Landing.jsx`, `client/src/App.jsx`, `docs/DESIGN.md` |
| DMC-010 | Story | Registrar datos básicos y consentimiento del paciente | Como paciente, quiero registrar mis datos y autorizar el uso del caso | Nombre, teléfono, edad, ciudad y consentimiento son obligatorios; email se normaliza; sin consentimiento no se escribe en DB | 5 | Crítica | S03 | Completado | `client/src/pages/RegistroPaciente.jsx`, `src/domain/patients/patient.validation.js` |
| DMC-011 | Story | Implementar cuestionario clínico dinámico | Como paciente, quiero responder solo las preguntas relevantes a mis síntomas | Se muestran las features definidas en `triajeFeatures.js`; hay progreso; respuestas quedan estructuradas; el cuestionario vacío se rechaza | 8 | Alta | S03 | Completado | `client/src/data/triajeFeatures.js`, `client/src/pages/RegistroPaciente.jsx` |
| DMC-012 | Story | Confirmar número y resultado del caso | Como paciente, quiero saber si mi caso fue asignado o quedó pendiente | La respuesta muestra `CASO-XXXXXX`, categoría, alerta si corresponde y estudiante/fecha/horario solo si existe asignación | 5 | Media | S03 | Completado | `src/application/patients/patient.service.js`, `src/adapters/inbound/http/routes/patients.routes.js` |
| DMC-013 | Story | Registrar estudiante con credenciales | Como estudiante, quiero crear mi cuenta y quedar disponible para casos | Email único; password fuerte con confirmación; año 4to/5to; al menos una especialidad y un horario válido | 5 | Alta | S04 | Completado | `client/src/pages/RegistroEstudiante.jsx`, `src/domain/students/student.validation.js` |
| DMC-014 | Story | Guardar especialidades, clínica y horarios | Como coordinador, necesito saber qué puede atender cada estudiante y cuándo | Cada disponibilidad guarda especialidad, clínica, día, inicio, fin y capacidad; duplicados y horarios invertidos se rechazan | 8 | Alta | S04 | Completado | `src/adapters/outbound/persistence/postgres/student.repository.js`, migración PostgreSQL base |
| DMC-015 | Story | Gestionar pacientes y estudiantes desde el panel | Como coordinador, quiero listar, crear, editar y desactivar registros | CRUD usa rutas protegidas; la desactivación es de negocio y no borra físicamente el caso; el frontend muestra loading/error/vacío | 8 | Media | S04 | Completado | `client/src/pages/Patients.jsx`, `client/src/pages/Students.jsx`, repositorios y rutas |
| DMC-016 | Task | Normalizar catálogos y reglas de integridad | Como sistema, necesito que ciudades, especialidades, prioridades y estados sean consistentes | Alias se normalizan; emails van a minúscula; FK/índices protegen relaciones; un estudiante inactivo no entra al matching | 5 | Media | S04 | Completado | `src/domain/common.js`, validaciones, migraciones PostgreSQL baseline y seguimiento |
| DMC-017 | Story | Pre-categorizar el caso con fallback determinista | Como coordinador, quiero una categoría operativa trazable sin depender de una respuesta de IA | Infección/fiebre, periodoncia, patrón pulpar, fractura, lesión y menores siguen reglas documentadas; una falla IA no bloquea intake | 8 | Crítica | S05 | Completado | `src/domain/matching/scoring.js`, `src/application/patients/patient.service.js` |
| DMC-018 | Story | Calcular score ponderado explicable | Como coordinador, quiero saber por qué un estudiante fue elegido | Pesos suman 100%: horario 30, especialidad 25, carga 20, prioridad 15, dolor 5, experiencia 5; factores quedan persistidos | 8 | Crítica | S05 | Completado | `src/domain/matching/scoring.js`, campo `factores_matching`, pruebas de matching |
| DMC-019 | Story | Filtrar candidatos no elegibles | Como sistema, necesito evitar asignaciones incompatibles | Se excluyen inactivos, sin especialidad/clínica, sin capacidad, sin horario compatible y pacientes con asignación activa | 8 | Alta | S05 | Completado | `src/adapters/outbound/persistence/postgres/matching.repository.js` |
| DMC-020 | Story | Ejecutar matching automático con transacción y lock | Como coordinador, quiero asignar la cola sin duplicar casos bajo concurrencia | Se bloquea paciente/candidatos; se crea asignación, actualiza carga y encola avisos en una transacción con bloqueos compatibles con PostgreSQL; sin candidato queda pendiente. Para derivaciones aprobadas se prioriza menor carga, luego más derivaciones aprobadas y después compatibilidad | 13 | Crítica | S05 | Completado | `src/application/matching/matching.service.js`, repositorios PostgreSQL y pruebas |
| DMC-021 | Story | Modelar ciclo de vida de asignaciones | Como coordinador, quiero avanzar un caso solo por estados permitidos | Se aceptan únicamente las transiciones documentadas; `completado` y `cancelado` son terminales; se guardan fechas de contacto, tratamiento y cierre | 8 | Alta | S06 | Completado | `src/domain/assignments/assignment.policy.js`, `src/application/assignments/assignment.service.js` |
| DMC-022 | Story | Permitir al estudiante revisar sus asignaciones | Como estudiante, quiero ver mis casos y actualizar estado/observaciones | `/asignaciones/mias` solo devuelve sus registros; no puede modificar asignaciones ajenas; puede avanzar estados permitidos, agregar notas al historial y proponer una derivación después del contacto o durante el tratamiento | 5 | Media | S06 | Completado | `client/src/pages/MisAsignaciones.jsx`, `client/src/components/CaseDetail.jsx`, rutas y pruebas |
| DMC-023 | Story | Operar asignaciones desde el panel | Como coordinador, quiero consultar y actualizar asignaciones | Se listan paciente, estudiante, fecha, score, estado y factores; se puede operar dentro de permisos, cancelar mediante operación de negocio, validar precalificación, revisar/aprobar/rechazar derivaciones y reasignar dejando historial | 8 | Alta | S06 | Completado | `client/src/pages/Assignments.jsx`, `client/src/components/CaseDetail.jsx`, rutas y pruebas |
| DMC-024 | Task | Sincronizar carga y estado al cerrar | Como sistema, necesito que capacidad y paciente reflejen la operación | Al completar o cancelar se actualiza la carga una sola vez; completar incrementa `casos_completados`; cancelar devuelve paciente a pendiente. La propuesta de derivación conserva el cupo de origen hasta revisión; al aprobar se libera una vez y se busca receptor sin exceder capacidad | 8 | Alta | S06 | Completado | `src/adapters/outbound/persistence/postgres/assignment.repository.js`, `case.repository.js` |
| DMC-025 | Story | Mostrar dashboard de operación | Como coordinador, quiero ver la situación general en una sola pantalla | Se muestran pacientes, pendientes, estudiantes activos, asignaciones, activas y score promedio; métricas provienen de DB | 5 | Media | S07 | Completado | `client/src/pages/Dashboard.jsx`, `src/application/dashboard/`, `dashboard.repository.js` |
| DMC-026 | Story | Consultar pendientes y ejecutar matching | Como coordinador, quiero revisar la cola antes o después de ejecutar el lote | `/matching/pending`, `/matching/stats`, `/matching/weights` y `POST /matching/auto` exigen rol; la UI muestra matched, unmatched y fallas | 5 | Alta | S07 | Completado | `client/src/pages/Matching.jsx`, `matching.routes.js` |
| DMC-027 | Story | Registrar notificaciones en outbox | Como sistema, quiero dejar avisos de asignación listos para envío | Cada asignación con email crea aviso para paciente/estudiante; se registra tipo, asunto, estado, intentos y error; coordinador consulta la cola | 8 | Alta | S07 | Completado | `notificaciones_email`, `notifications.repository.js`, `client/src/pages/Notifications.jsx` |
| DMC-028 | Story | Integrar agente IA de pre-categorización | Como sistema, quiero enriquecer respuestas estructuradas sin decidir el matching | FastAPI expone `/health` y `/pre-categorize`; salida se normaliza; timeout/HTTP inválido devuelve fallback; nunca selecciona estudiante | 8 | Alta | S07 | En progreso | `ai_agent/`, `src/adapters/outbound/ai/triage-agent.adapter.js`, `scripts/check-ai-agent.js` |
| DMC-029 | Story | Aplicar sistema visual y accesibilidad | Como usuario, quiero una interfaz clara en escritorio y móvil | Existe una acción primaria por bloque, foco visible, labels asociados, `aria-invalid`, modal con Escape, `prefers-reduced-motion`, tablas adaptables y contraste suficiente | 8 | Alta | S08 | En progreso | `client/src/components/`, `client/src/styles/`, `client/src/App.css`, `docs/DESIGN.md` |
| DMC-030 | Task | Cubrir estados de red y errores del cliente | Como usuario, quiero recuperar una solicitud fallida sin perder contexto | `apiFetch` refresca sesión una vez ante 401; páginas muestran loading/error/empty/success; errores no exponen secretos | 5 | Alta | S08 | Completado | `client/src/lib/api.js`, `Skeleton.jsx`, `EmptyState.jsx`, `Toast.jsx`, `ErrorBoundary.jsx` |
| DMC-031 | Task | Validar backend con unitarias e integración | Como equipo, necesito evidencia automática del comportamiento crítico | Pasan pruebas de auth, permisos, errores, IA, matching y contrato HTTP; coverage respeta los umbrales configurados | 8 | Alta | S08 | Completado | 89/89 Jest, 19 con PostgreSQL real, siete del cliente; núcleo con 97% de líneas; `docs/PRUEBAS_Y_CI.md` y JSON de evidencias |
| DMC-032 | Task | Completar hardening de producción y privacidad | Como responsable del sistema, necesito operar datos clínicos con controles formales | Secretos gestionados, retención/anonimización, backup probado, auditoría de roles/estados/capacidad y revisión legal quedan documentados | 8 | Media | S08 | En progreso | `src/infrastructure/http/app.js`, `docker-compose.yml`, `README.md`; faltan controles formales y evidencias |
| DMC-033 | Story | Operar el worker real de correo | Como paciente/estudiante, quiero recibir el aviso de asignación | Worker consume pendientes, usa plantillas versionadas, incrementa intentos, registra éxito/error y aplica reintento con límite; un aviso no se duplica; proveedor y proceso quedan configurados en el entorno desplegado | 8 | Media | S09 | En progreso | `scripts/email-worker.js`, `src/adapters/outbound/email/resend.adapter.js`, servicio y pruebas; falta verificar el proveedor real |
| DMC-034 | Task | Crear CI/CD del repositorio destino | Como equipo, necesito bloquear merges que rompan el producto | Pipeline ejecuta lint backend/frontend, tests, coverage, build, migraciones de validación y `npm audit --omit=dev` | 5 | Media | S09 | En progreso | `.github/workflows/ci.yml`, `docs/PRUEBAS_Y_CI.md`; falta primer run remoto y check obligatorio de rama |
| DMC-035 | Task | Preparar observabilidad, backup y carga | Como equipo, necesito saber si el sistema funciona y recuperarlo | Hay logs estructurados sin secretos, métricas/alertas, backup automático, prueba de restore y prueba de concurrencia/carga con datos representativos | 8 | Media | S09 | En progreso | Carga/estrés local aprobado: 380 lecturas, concurrencia 1/10/50; faltan métricas/alertas y backup/restauración; `docs/PRUEBAS_Y_CI.md` |
| DMC-036 | Story | Ejecutar piloto E2E y cerrar la entrega | Como equipo Capstone, necesito demostrar el flujo completo | Un caso recorre intake → categorización → matching → asignación → contacto/tratamiento → completado/cancelado; se adjuntan capturas, resultados y manual | 8 | Alta | S09 | Completado | Piloto técnico local: flujo HTTP completo, nueve escenarios de navegador y 19 exploratorios del agente con 11 capturas; instrucciones en `README.md` y `docs/SEGUIMIENTO_DERIVACIONES.md`; resultados en `docs/E2E_EXPLORATORIO_LOCAL.md`. Aceptación humana y validación desplegada son condiciones de entrega final pendientes |

### Resumen de estado después de las pruebas locales

| Estado | Cantidad | Historias |
|---|---:|---|
| Completado | 30 | DMC-001 a DMC-027, DMC-030, DMC-031 y DMC-036 |
| En progreso | 6 | DMC-028, DMC-029, DMC-032, DMC-033, DMC-034 y DMC-035 |
| Por iniciar | 0 | No hay historias sin iniciar en esta tabla |

El E2E local cierra el piloto técnico de DMC-036 según sus criterios escritos. La aprobación humana, la demostración desplegada y los controles operativos pendientes siguen siendo condiciones para la entrega final; no se declaran cumplidos por el resultado local.

### Checklist de finalización

`[x]` corresponde a **Completado** en la tabla. `[ ]` corresponde a una historia con trabajo pendiente. Las capacidades terminadas dentro de historias en progreso se detallan después, para que no se confunda implementación parcial con finalización.

- [x] **DMC-001 — Visión, actores y alcance:** presentes en `README.md` y `docs/PRODUCT.md`.
- [x] **DMC-002 — Arquitectura modular hexagonal:** backend organizado por capas; `docs/ARCHITECTURE.md` actualizado con PostgreSQL, pool `pg`, migraciones, transacciones e historial.
- [x] **DMC-003 — Esquema PostgreSQL:** baseline y migración de seguimiento versionados; la base local de prueba se migró desde cero y Supabase quedó con 2/2 migraciones ejecutadas, sin pendientes.
- [x] **DMC-004 — Ejecución local y Docker:** instalación, configuración Compose y API local con PostgreSQL verificadas; falta ejecutar `docker compose up --build` como comprobación adicional del contenedor.
- [x] **DMC-005 — Login/logout:** servicio/controlador de autenticación implementados.
- [x] **DMC-006 — Refresh token:** rotación y persistencia de hash implementadas; hay pruebas correspondientes en el repo.
- [x] **DMC-007 — Roles y permisos:** middleware y rutas protegidas presentes en backend y frontend.
- [x] **DMC-008 — Protecciones HTTP:** manejo central de errores y controles de Express presentes.
- [x] **DMC-009 — Rutas públicas:** landing, registro público y login implementados en React.
- [x] **DMC-010 — Intake y consentimiento:** implementados; existen pruebas de rechazo sin consentimiento.
- [x] **DMC-011 — Cuestionario clínico:** features y formulario presentes; hay prueba de cuestionario vacío.
- [x] **DMC-012 — Número de caso:** el servicio genera `CASO-XXXXXX` y la pantalla lo muestra.
- [x] **DMC-013 — Registro de estudiante:** formulario y validaciones del perfil presentes.
- [x] **DMC-014 — Disponibilidad/capacidad:** persistencia y migración del esquema presentes.
- [x] **DMC-015 — Gestión de pacientes/estudiantes:** admin/coordinador crean estudiantes dentro del panel con cuenta, especialidades y horarios; pueden editar/desactivar. El alta protegida reutiliza el servicio público y está cubierta por pruebas PostgreSQL y navegador.
- [x] **DMC-016 — Catálogos e integridad:** normalización, reglas de dominio, claves foráneas e índices presentes.
- [x] **DMC-017 — Pre-categorización:** reglas deterministas y fallback ante falla del agente implementados.
- [x] **DMC-018 — Matching ponderado:** pesos 30/25/20/15/5/5, score y factores explicables implementados; hay pruebas unitarias.
- [x] **DMC-019 — Filtros de candidatos:** elegibilidad, disponibilidad y capacidad implementadas en repositorio/servicio.
- [x] **DMC-020 — Matching transaccional:** control de capacidad, bloqueo y pruebas PostgreSQL; el matching de derivados prioriza menor carga y luego más derivaciones aprobadas.
- [x] **DMC-021 — Estados de asignación:** transiciones permitidas, estados terminales y eventos de historial implementados y probados localmente.
- [x] **DMC-022 — Mis asignaciones:** estudiante ve solo sus casos, contacto, precalificación e historial; puede avanzar estado, añadir nota y proponer derivación.
- [x] **DMC-023 — Operación de asignaciones:** personal revisa clasificación/derivación, asigna o reasigna; pruebas locales cubren aprobación, rechazo y reasignación.
- [x] **DMC-024 — Sincronización de carga/estado:** liberación y reasignación de cupos verificadas en pruebas de PostgreSQL, incluidas operaciones concurrentes.
- [x] **DMC-025 — Dashboard:** interfaz y consultas de métricas presentes.
- [x] **DMC-026 — Matching operativo:** rutas y vista de pendientes, estadísticas, pesos y ejecución automática presentes.
- [x] **DMC-027 — Outbox:** cola, vista y acciones de envío/reintento manual implementadas; envío real con proveedor aún sin verificar.
- [ ] **DMC-028 — Agente IA:** servicio Python, endpoint y adaptador presentes; el prompt obtiene el número de claves desde `REQUIRED_FEATURES` (23 en el contrato actual) y el self-check comprueba la consistencia. Fallback aprobado por HTTP y registro público; falta validar una llamada real al LLM.
- [ ] **DMC-029 — Sistema visual:** componentes, modal con Escape y vista móvil de 390 px comprobados; nombre Dental Match corregido en pantallas públicas. Falta auditoría completa de accesibilidad y responsive.
- [x] **DMC-030 — Estados de red del cliente:** cliente API, refresh de sesión y componentes loading/error/vacío presentes.
- [x] **DMC-031 — Pruebas:** 89/89 Jest (58 unitarias, 31 integración, 19 PostgreSQL reales), siete del cliente y nueve escenarios de navegador, incluido el flujo clínico completo. Lint/build y cobertura superior al umbral aprobados. Además, 19 escenarios exploratorios por agente; resultados en `docs/PRUEBAS_Y_CI.md` y `docs/E2E_EXPLORATORIO_LOCAL.md`.
- [ ] **DMC-032 — Hardening/privacidad:** faltan política formal de retención/anonimización, backup/restauración comprobada y revisión legal. Casos de seguridad HTTP comprobados; auditoría de producción sin avisos en backend/cliente. Quedan 30 avisos altos en herramientas de desarrollo del backend (Jest/nodemon/braces), sin corrección compatible propuesta por npm en este corte.
- [ ] **DMC-033 — Worker de correo:** worker, adaptador Resend, reclamos, idempotencia y reintentos están en el código y tienen pruebas simuladas; falta confirmar configuración/despliegue del worker, plantillas versionadas y entrega real con proveedor.
- [ ] **DMC-034 — CI/CD:** workflow implementado con lint, cobertura, pruebas PostgreSQL/cliente/sistema/navegador, build, migraciones y auditoría. Falta comprobar la primera ejecución en GitHub y exigir el check `quality` antes de integrar cambios.
- [ ] **DMC-035 — Observabilidad/backup/carga:** health check e identificador de petición presentes; rendimiento/estrés local comprobado con concurrencia 1/10/50. Faltan métricas/alertas operativas, backup/restauración y medición en el entorno desplegado.
- [x] **DMC-036 — Piloto E2E y entrega:** piloto técnico local completado con intake/fallback, asignación, contacto, derivación, aprobación y cierre. Resultados, 11 capturas exploratorias y manual de uso/activación disponibles. No implica aceptación humana ni validación de producción.

#### Partes completadas dentro de historias en progreso

- [x] **DMC-028:** timeout/error no bloquea el registro; fallback comprobado en pruebas y cuestionario público.
- [x] **DMC-029:** navegación de los tres roles, validaciones visibles, modal y uso móvil comprobados en los recorridos registrados.
- [x] **DMC-032:** pruebas HTTP de permisos y entradas inválidas; auditoría de dependencias de producción sin avisos.
- [x] **DMC-033:** worker, idempotencia y reintentos probados con proveedor simulado; mensaje controlado cuando falta configuración real.
- [x] **DMC-034:** archivo del pipeline terminado; sus comandos de calidad pasan localmente.
- [x] **DMC-035:** rendimiento/estrés local aprobado con 380 consultas y concurrencia 1/10/50, sin errores y recuperación saludable.

#### Validaciones ejecutadas para este corte en Capstone

Las pruebas solicitadas en la foto de la profesora están mapeadas en [Pruebas y CI](../docs/PRUEBAS_Y_CI.md). Unitarias, integración, sistema, regresión, rendimiento, seguridad y estrés tienen resultados técnicos aprobados en el alcance local documentado. Los escenarios de aceptación fueron recorridos por el agente; la aprobación humana UAT continúa pendiente.

- [x] `npm ci` y `npm --prefix client ci`: instalación reproducible completada desde los lockfiles.
- [x] `npm run test:coverage -- --runInBand`: 89/89, sin omisiones, incluidas 19 PostgreSQL; siete pruebas del cliente y nueve escenarios de navegador aprobados. Evidencias en `docs/evidencias/pruebas-jest-20261005.json` y `docs/PRUEBAS_Y_CI.md`.
- [x] `npm run test:coverage -- --runInBand`: el reporte documentado registra 93.75% statements, 88.51% branches, 92% functions y 97% lines en el núcleo cubierto; no representa cobertura de todos los archivos.
- [x] `npm run lint`: `.eslintrc.json` está versionado y la verificación local documentada reporta lint de backend aprobado.
- [x] `npm --prefix client run lint` y `npm --prefix client run build`: ambos pasan.
- [x] Recorrido exploratorio E2E por agente: 19 escenarios del administrador, coordinador, estudiante y público, incluido móvil; 11 capturas en `docs/E2E_EXPLORATORIO_LOCAL.md`.
- [x] `npm audit --omit=dev` en backend: 0 vulnerabilidades reportadas.
- [x] `npm --prefix client audit --omit=dev`: cero avisos tras actualizar React Router y dependencias compatibles; también cero en la auditoría completa del cliente.
- [x] `docker compose config --quiet`: pasa con variables temporales de revisión; no se creó ni guardó un `.env` ni secretos reales.
- [x] `python -m ai_agent.agent`: self-check de parseo/normalización y consistencia del conteo de claves aprobado con un LLM simulado; **no** comprueba una llamada real a un proveedor.
- [x] Migraciones PostgreSQL desde esquema limpio, `npm run migrate:status` (2/2, 0 pendientes), `GET /api/health` y despliegue público comprobados.
- [ ] `docker compose up --build` y llamada real al LLM: aún sin evidencia.

#### Pendiente para poder afirmar aceptación del MVP

- [x] Completar DMC-002: `docs/ARCHITECTURE.md` alineado con PostgreSQL.
- [ ] Completar la validación de DMC-004 con `docker compose up --build`.
- [ ] Cerrar DMC-028: probar respuesta estructurada real del LLM y fallback con entradas sintéticas.
- [ ] Cerrar DMC-029: auditar teclado, foco, contraste, lectores de pantalla y responsive en todas las pantallas.
- [ ] Completar DMC-032: documentar privacidad/retención, probar restauración de backup, hacer revisión legal y dar seguimiento a los avisos de dependencias de desarrollo; auditoría de producción y casos HTTP ya comprobados.
- [ ] Cerrar DMC-033: configurar worker y remitente en el entorno, comprobar entrega y reintento con una dirección de prueba; resolver el criterio de plantillas versionadas.
- [ ] Cerrar DMC-034: publicar el workflow ya creado, comprobar el primer run en GitHub y configurar `quality` como check obligatorio de la rama de integración.
- [ ] Completar DMC-035: métricas/alertas, backup automático, restauración y medición de carga en el entorno desplegado; prueba local con 380 consultas y concurrencia 1/10/50 aprobada.
- [x] DMC-036: piloto técnico local completado; resultados, capturas e instrucciones disponibles.
- [ ] Aceptación final: Carlos Avello recorre los casos UAT y registra fecha, aprobación y observaciones. Después se valida el flujo completo desplegado con datos ficticios; el recorrido local no prueba producción.

### Prioridades de cierre — corte 05-10-2026

Esta lista orienta el trabajo restante del repositorio. No actualiza por sí sola los estados del Jira remoto.

1. **DMC-002, DMC-003 y DMC-015:** documentación PostgreSQL y alta de estudiante desde el panel completadas; migraciones de prueba y Supabase aplicadas.
2. **DMC-028:** probar el endpoint con un proveedor LLM real y datos sintéticos, incluyendo el fallback.
3. **DMC-029 y DMC-032:** terminar la revisión de accesibilidad/responsive y documentar privacidad, retención, auditoría, revisión legal y backup/restauración.
4. **DMC-033:** configurar el worker y Resend en el entorno de prueba; verificar envío y reintento con una dirección controlada y resolver el criterio de plantillas versionadas.
5. **DMC-034 y DMC-035:** publicar/comprobar el CI creado y exigir el check de rama; completar observabilidad y restauración. Las pruebas locales de carga/estrés están registradas.
6. **Entrega final:** DMC-036 ya tiene piloto técnico local completo. Falta aceptación humana UAT y comprobar el flujo completo con datos sintéticos en el entorno desplegado. La revisión registrada de producción fue de solo lectura.

**Criterio para decir “MVP demostrable”:** URL accesible, login de demo, PostgreSQL persistente/migrado, agente real probado y con fallback, recorrido completo con datos sintéticos, tests/coverage/lint/build reproducibles y límites de privacidad explicados. Esto no equivale a habilitar operación clínica real ni a cerrar todo el alcance de 18 semanas.

## 7. Dependencias críticas

```text
DMC-001 → DMC-002 → DMC-003 → DMC-004
                         ↓
                      DMC-005 → DMC-006 → DMC-007 → DMC-008
                         ↓
DMC-009 → DMC-010 → DMC-011 → DMC-012
DMC-013 → DMC-014 → DMC-015 → DMC-016
DMC-012 + DMC-014 + DMC-016 → DMC-017 → DMC-018 → DMC-019 → DMC-020
DMC-020 → DMC-021 → DMC-022 + DMC-023 → DMC-024
DMC-020 → DMC-025 + DMC-026 + DMC-027
DMC-017 → DMC-028; DMC-029 + DMC-030 + DMC-031 → DMC-032 → DMC-033 + DMC-034 + DMC-035 → DMC-036
```

## 8. Definition of Done común

Una historia se marca terminada solo cuando:

1. El código está ubicado en la capa correcta y no duplica reglas existentes.
2. La entrada inválida, el error de red y el estado vacío tienen comportamiento definido.
3. Se actualizan pruebas, documentación y contrato API cuando aplica.
4. Backend y frontend están probados en el flujo afectado.
5. No se suben `.env`, contraseñas, tokens, `node_modules`, `coverage` ni datasets locales.
6. La aceptación se puede demostrar con una prueba, una llamada HTTP, una captura o una ejecución reproducible.

## 9. Comandos de evidencia para la revisión

```powershell
npm ci
npm --prefix client ci
npm test -- --runInBand
npm run lint
npm --prefix client run lint
npm --prefix client run build
npm audit --omit=dev
docker compose config --quiet
npm run migrate:status
```

Para la demostración de IA, levantar el agente y ejecutar:

```powershell
npm run test:ai-agent
```

## 10. Nota para el traspaso al repositorio destino

Este archivo es el backlog Markdown disponible en `Backlog/`. No se encontró en esta carpeta el handoff `JIRA_SPRINT_01_HANDOFF.md` ni el archivo `jira-import-18-weeks.csv` que se mencionaban anteriormente; no se deben tratar como entregables existentes. Antes de importar o cerrar historias, confirmar las claves y estados en el Jira real del equipo.

## 11. Auditoría de procedencia y secuencia — 21-09-2026

- La comparación entre `capstone_dental-match` y `dental_matching_IA` encontró **93 archivos idénticos** en `src/`, `client/src/`, `ai_agent/`, `scripts/` y `tests/` (ignorando diferencias de fin de línea). También coinciden `server.js`, `package*.json`, Docker, Jest y los documentos base revisados. Esto confirma que la implementación actual de Capstone proviene del repo fuente.
- El historial de `dental_matching_IA` tiene 28 commits; su historia no se trasladó a Capstone como historial de entregas. Capstone tiene 5 commits entre el 09 y el 15 de septiembre de 2026. Tres commits incorporaron la mayor parte de la arquitectura, base de datos, frontend, agente y pruebas el **15-09-2026**.
- Solo dos mensajes de commit en Capstone incluyen claves DMC: `DMC-001 DMC-002` y `DMC-009 DMC-028 DMC-031`. Eso no acredita que las demás historias se hayan entregado en orden ni permite confirmar que esas claves existan en el tablero Jira.
- Por lo tanto, el plan de 18 semanas de este documento es una **planificación por ejecutar**, no un registro histórico de nueve sprints ya completados. Las próximas entregas deben registrarse desde ahora con la clave real de Jira, una historia por cambio lógico y evidencia de aceptación; no se deben inventar fechas ni commits retrospectivos.
