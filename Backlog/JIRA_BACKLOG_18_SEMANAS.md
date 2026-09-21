# DentalMatch Capstone — backlog Jira y plan de hitos

## 1. Propósito del documento

Este documento convierte el proyecto actual en un backlog académico y operativo para **18 semanas**. Está redactado para poder copiarse al repositorio destino `DentalMatch Capstone` y luego cargarse en Jira.

La planificación propuesta asume **9 sprints de 2 semanas**, con revisión y demostración al cierre de cada sprint. Los estados `Por iniciar` representan el plan del trabajo del equipo en Capstone; no significan que el repositorio esté vacío. El repo ya contiene una implementación base copiada de `dental_matching_IA`, pero el historial de Capstone no demuestra que se haya construido en 9 sprints ni que sus criterios de aceptación estén validados.

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
- API Express, MySQL, migraciones reproducibles, Docker, pruebas unitarias e integración y frontend React/Vite.

### Fuera de alcance de la demo

- Diagnóstico médico automático.
- Selección de estudiantes por un LLM.
- Historia clínica completa o ficha clínica legal.
- Pago, agenda clínica institucional o videollamada.
- Envío real de correo hasta que se implemente el worker y el proveedor correspondiente.

## 3. Épicas de Jira

| Código | Épica | Resultado esperado | Evidencia principal en el repo |
|---|---|---|---|
| DMC-EP01 | Plataforma, arquitectura y datos | Base ejecutable, modular, hexagonal y persistencia MySQL reproducible | `package.json`, `server.js`, `src/infrastructure/`, `src/domain/`, `src/infrastructure/database/migrations/` |
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
| S01 | 1–2 | EP01 | Alcance, arquitectura, API base, conexión y migraciones | H1: repositorio base ejecutable y esquema MySQL |
| S02 | 3–4 | EP02, EP08 | Auth, cookies, roles, errores, límites y estructura de navegación | H2: acceso seguro por rol |
| S03 | 5–6 | EP03 | Landing, intake, consentimiento, cuestionario y confirmación | H3: caso de paciente registrado |
| S04 | 7–8 | EP04 | Registro de estudiante, especialidades, horarios y capacidad; CRUD staff | H3: candidato elegible persistido |
| S05 | 9–10 | EP05 | Categorización, pesos, filtros, explicación y matching automático | H4: primer matching reproducible |
| S06 | 11–12 | EP06 | Estados, permisos, “Mis asignaciones”, cancelación y carga | H5: seguimiento end-to-end |
| S07 | 13–14 | EP07, EP05 | Dashboard, pendientes, outbox y agente IA | H6/H7: operación e IA auxiliar |
| S08 | 15–16 | EP08 | Accesibilidad, pruebas, Docker, rate limits y revisión de seguridad | H8: release candidate |
| S09 | 17–18 | Todas | Worker de correo, CI, backup, pruebas E2E, manual y presentación | H9: entrega Capstone |

## 6. Product backlog detallado

Los criterios de aceptación están escritos como condiciones verificables para Jira. Todos los issues mantienen el estado planificado `Por iniciar`. Las casillas agregadas abajo registran únicamente código/artefactos encontrados y verificaciones realizadas en el checkout; **no** cambian el estado de Jira ni equivalen a una historia aceptada. El tablero Jira no está conectado a esta revisión, por lo que sus estados reales y la existencia de cada clave deben comprobarse allí.

| ID | Tipo | Resumen Jira | Historia de usuario / objetivo | Criterios de aceptación | SP | Prioridad | Sprint | Estado planificado | Entregable / evidencia |
|---|---|---|---|---|---:|---|---|---|---|
| DMC-001 | Task | Definir visión, actores y alcance | Como equipo, necesito acordar qué problema resuelve DentalMatch y qué no resuelve | Se documentan usuarios, propósito, límites, riesgos y criterios de éxito; no se promete diagnóstico | 3 | Media | S01 | Por iniciar | `docs/PRODUCT.md`, `README.md` |
| DMC-002 | Task | Montar monolito modular hexagonal | Como desarrollador, necesito separar dominio, aplicación, adaptadores e infraestructura | Las rutas no contienen SQL ni reglas; los casos de uso coordinan y los repositorios persisten | 5 | Alta | S01 | Por iniciar | `docs/ARCHITECTURE.md`, `src/domain/`, `src/application/`, `src/adapters/`, `src/infrastructure/` |
| DMC-003 | Story | Crear esquema MySQL reproducible | Como equipo, necesito levantar la base sin editar SQL manualmente | Migraciones crean users, estudiantes, especialidades, pacientes, asignaciones, notificaciones y control de versiones | 8 | Crítica | S01 | Por iniciar | `src/infrastructure/database/migrations/20260907000001_modular_monolith_schema.js` y migraciones 002/003 |
| DMC-004 | Task | Preparar ejecución local y Docker | Como integrante del equipo, necesito instalar y ejecutar el proyecto de forma repetible | `npm ci`, `npm --prefix client ci` y `docker compose config --quiet` funcionan; secretos solo salen de `.env` | 5 | Alta | S01 | Por iniciar | `package.json`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `scripts/migrate.js` |
| DMC-005 | Story | Iniciar sesión y cerrar sesión | Como usuario operativo, quiero entrar con email/contraseña y cerrar mi sesión | Credenciales correctas crean cookies HttpOnly; credenciales inválidas no revelan información sensible; logout invalida refresh | 5 | Crítica | S02 | Por iniciar | `src/application/auth/auth.service.js`, `src/adapters/inbound/http/controllers/auth.controller.js` |
| DMC-006 | Story | Renovar sesión con refresh token rotativo | Como usuario, quiero mantener mi sesión sin guardar tokens en localStorage | El refresh token original no se persiste en claro; una renovación rota el hash y una sesión inválida devuelve 401 | 5 | Alta | S02 | Por iniciar | `src/adapters/outbound/security/jwt.adapter.js`, `src/adapters/outbound/persistence/mysql/auth.repository.js`, `tests/unit/authService.test.js` |
| DMC-007 | Story | Aplicar roles y permisos mínimos | Como administrador, necesito que cada rol vea solo lo que le corresponde | Admin/coordinador operan; estudiante solo ve sus asignaciones; rutas ajenas responden 401/403 y redirigen en frontend | 5 | Alta | S02 | Por iniciar | `src/adapters/inbound/http/middleware/auth.js`, `client/src/App.jsx`, pruebas de auth |
| DMC-008 | Task | Centralizar errores y protecciones HTTP | Como equipo, necesito respuestas seguras y consistentes ante errores | Existe request id, límite de body, rate limit, Helmet, compresión, 404 y error handler; producción no expone stack | 5 | Media | S02 | Por iniciar | `src/infrastructure/http/app.js`, `src/adapters/inbound/http/middleware/errorHandler.js` |
| DMC-009 | Story | Publicar landing y rutas públicas | Como visitante, quiero entender el servicio y elegir paciente o estudiante | `/landing`, `/registro-paciente`, `/registro-estudiante` y `/login` son navegables; copy en español; sin testimonios inventados | 3 | Media | S03 | Por iniciar | `client/src/pages/Landing.jsx`, `client/src/App.jsx`, `docs/DESIGN.md` |
| DMC-010 | Story | Registrar datos básicos y consentimiento del paciente | Como paciente, quiero registrar mis datos y autorizar el uso del caso | Nombre, teléfono, edad, ciudad y consentimiento son obligatorios; email se normaliza; sin consentimiento no se escribe en DB | 5 | Crítica | S03 | Por iniciar | `client/src/pages/RegistroPaciente.jsx`, `src/domain/patients/patient.validation.js` |
| DMC-011 | Story | Implementar cuestionario clínico dinámico | Como paciente, quiero responder solo las preguntas relevantes a mis síntomas | Se muestran las features definidas en `triajeFeatures.js`; hay progreso; respuestas quedan estructuradas; el cuestionario vacío se rechaza | 8 | Alta | S03 | Por iniciar | `client/src/data/triajeFeatures.js`, `client/src/pages/RegistroPaciente.jsx` |
| DMC-012 | Story | Confirmar número y resultado del caso | Como paciente, quiero saber si mi caso fue asignado o quedó pendiente | La respuesta muestra `CASO-XXXXXX`, categoría, alerta si corresponde y estudiante/fecha/horario solo si existe asignación | 5 | Media | S03 | Por iniciar | `src/application/patients/patient.service.js`, `src/adapters/inbound/http/routes/patients.routes.js` |
| DMC-013 | Story | Registrar estudiante con credenciales | Como estudiante, quiero crear mi cuenta y quedar disponible para casos | Email único; password fuerte con confirmación; año 4to/5to; al menos una especialidad y un horario válido | 5 | Alta | S04 | Por iniciar | `client/src/pages/RegistroEstudiante.jsx`, `src/domain/students/student.validation.js` |
| DMC-014 | Story | Guardar especialidades, clínica y horarios | Como coordinador, necesito saber qué puede atender cada estudiante y cuándo | Cada disponibilidad guarda especialidad, clínica, día, inicio, fin y capacidad; duplicados y horarios invertidos se rechazan | 8 | Alta | S04 | Por iniciar | `src/adapters/outbound/persistence/mysql/student.repository.js`, migración 001 |
| DMC-015 | Story | Gestionar pacientes y estudiantes desde el panel | Como coordinador, quiero listar, crear, editar y desactivar registros | CRUD usa rutas protegidas; la desactivación es de negocio y no borra físicamente el caso; el frontend muestra loading/error/vacío | 8 | Media | S04 | Por iniciar | `client/src/pages/Patients.jsx`, `client/src/pages/Students.jsx`, repositorios y rutas |
| DMC-016 | Task | Normalizar catálogos y reglas de integridad | Como sistema, necesito que ciudades, especialidades, prioridades y estados sean consistentes | Alias se normalizan; emails van a minúscula; FK/índices protegen relaciones; un estudiante inactivo no entra al matching | 5 | Media | S04 | Por iniciar | `src/domain/common.js`, validaciones, migraciones 002/003 |
| DMC-017 | Story | Pre-categorizar el caso con fallback determinista | Como coordinador, quiero una categoría operativa trazable sin depender de una respuesta de IA | Infección/fiebre, periodoncia, patrón pulpar, fractura, lesión y menores siguen reglas documentadas; una falla IA no bloquea intake | 8 | Crítica | S05 | Por iniciar | `src/domain/matching/scoring.js`, `src/application/patients/patient.service.js` |
| DMC-018 | Story | Calcular score ponderado explicable | Como coordinador, quiero saber por qué un estudiante fue elegido | Pesos suman 100%: horario 30, especialidad 25, carga 20, prioridad 15, dolor 5, experiencia 5; factores quedan persistidos | 8 | Crítica | S05 | Por iniciar | `src/domain/matching/scoring.js`, campo `factores_matching`, pruebas de matching |
| DMC-019 | Story | Filtrar candidatos no elegibles | Como sistema, necesito evitar asignaciones incompatibles | Se excluyen inactivos, sin especialidad/clínica, sin capacidad, sin horario compatible y pacientes con asignación activa | 8 | Alta | S05 | Por iniciar | `src/adapters/outbound/persistence/mysql/matching.repository.js` |
| DMC-020 | Story | Ejecutar matching automático con transacción y lock | Como coordinador, quiero asignar la cola sin duplicar casos bajo concurrencia | Se bloquea paciente/candidatos; se crea asignación, actualiza carga y encola avisos en una transacción; el lote usa `GET_LOCK`; sin candidato queda pendiente | 13 | Crítica | S05 | Por iniciar | `src/application/matching/matching.service.js`, `matching.repository.js`, pruebas |
| DMC-021 | Story | Modelar ciclo de vida de asignaciones | Como coordinador, quiero avanzar un caso solo por estados permitidos | Se aceptan únicamente las transiciones documentadas; `completado` y `cancelado` son terminales; se guardan fechas de contacto, tratamiento y cierre | 8 | Alta | S06 | Por iniciar | `src/domain/assignments/assignment.policy.js`, `src/application/assignments/assignment.service.js` |
| DMC-022 | Story | Permitir al estudiante revisar sus asignaciones | Como estudiante, quiero ver mis casos y actualizar estado/observaciones | `/asignaciones/mias` solo devuelve sus registros; no puede modificar asignaciones ajenas; puede avanzar estados permitidos y guardar observaciones | 5 | Media | S06 | Por iniciar | `client/src/pages/MisAsignaciones.jsx`, `assignments.routes.js` |
| DMC-023 | Story | Operar asignaciones desde el panel | Como coordinador, quiero consultar y actualizar asignaciones | Se listan paciente, estudiante, fecha, score, estado y factores; se puede editar dentro de permisos y cancelar mediante operación de negocio | 8 | Alta | S06 | Por iniciar | `client/src/pages/Assignments.jsx`, `src/adapters/inbound/http/routes/assignments.routes.js` |
| DMC-024 | Task | Sincronizar carga y estado al cerrar | Como sistema, necesito que capacidad y paciente reflejen la operación | Al completar/cancelar se libera `casos_activos`; completar incrementa `casos_completados`; cancelar devuelve paciente a pendiente; no hay carga negativa | 8 | Alta | S06 | Por iniciar | `src/adapters/outbound/persistence/mysql/assignment.repository.js` |
| DMC-025 | Story | Mostrar dashboard de operación | Como coordinador, quiero ver la situación general en una sola pantalla | Se muestran pacientes, pendientes, estudiantes activos, asignaciones, activas y score promedio; métricas provienen de DB | 5 | Media | S07 | Por iniciar | `client/src/pages/Dashboard.jsx`, `src/application/dashboard/`, `dashboard.repository.js` |
| DMC-026 | Story | Consultar pendientes y ejecutar matching | Como coordinador, quiero revisar la cola antes o después de ejecutar el lote | `/matching/pending`, `/matching/stats`, `/matching/weights` y `POST /matching/auto` exigen rol; la UI muestra matched, unmatched y fallas | 5 | Alta | S07 | Por iniciar | `client/src/pages/Matching.jsx`, `matching.routes.js` |
| DMC-027 | Story | Registrar notificaciones en outbox | Como sistema, quiero dejar avisos de asignación listos para envío | Cada asignación con email crea aviso para paciente/estudiante; se registra tipo, asunto, estado, intentos y error; coordinador consulta la cola | 8 | Alta | S07 | Por iniciar | `notificaciones_email`, `notifications.repository.js`, `client/src/pages/Notifications.jsx` |
| DMC-028 | Story | Integrar agente IA de pre-categorización | Como sistema, quiero enriquecer respuestas estructuradas sin decidir el matching | FastAPI expone `/health` y `/pre-categorize`; salida se normaliza; timeout/HTTP inválido devuelve fallback; nunca selecciona estudiante | 8 | Alta | S07 | Por iniciar | `ai_agent/`, `src/adapters/outbound/ai/triage-agent.adapter.js`, `scripts/check-ai-agent.js` |
| DMC-029 | Story | Aplicar sistema visual y accesibilidad | Como usuario, quiero una interfaz clara en escritorio y móvil | Existe una acción primaria por bloque, foco visible, labels asociados, `aria-invalid`, modal con Escape, `prefers-reduced-motion`, tablas adaptables y contraste suficiente | 8 | Alta | S08 | Por iniciar | `client/src/components/`, `client/src/styles/`, `client/src/App.css`, `docs/DESIGN.md` |
| DMC-030 | Task | Cubrir estados de red y errores del cliente | Como usuario, quiero recuperar una solicitud fallida sin perder contexto | `apiFetch` refresca sesión una vez ante 401; páginas muestran loading/error/empty/success; errores no exponen secretos | 5 | Alta | S08 | Por iniciar | `client/src/lib/api.js`, `Skeleton.jsx`, `EmptyState.jsx`, `Toast.jsx`, `ErrorBoundary.jsx` |
| DMC-031 | Task | Validar backend con unitarias e integración | Como equipo, necesito evidencia automática del comportamiento crítico | Pasan pruebas de auth, permisos, errores, IA, matching y contrato HTTP; coverage respeta los umbrales configurados | 8 | Alta | S08 | Por iniciar | `tests/unit/`, `tests/integration/`, `jest.config.js` |
| DMC-032 | Task | Completar hardening de producción y privacidad | Como responsable del sistema, necesito operar datos clínicos con controles formales | Secretos gestionados, retención/anonimización, backup probado, auditoría de roles/estados/capacidad y revisión legal quedan documentados | 8 | Media | S08 | Por iniciar | Base en `app.js`, `docker-compose.yml`, `README.md`; controles se implementan en el sprint |
| DMC-033 | Story | Implementar worker real de correo | Como paciente/estudiante, quiero recibir el aviso de asignación | Worker consume pendientes, usa plantillas versionadas, incrementa intentos, registra éxito/error y aplica reintento con límite; un aviso no se duplica | 8 | Media | S09 | Por iniciar | Crear `workers/email-worker.js`, adaptador de proveedor y `docs/OPERATIONS.md` |
| DMC-034 | Task | Crear CI/CD del repositorio destino | Como equipo, necesito bloquear merges que rompan el producto | Pipeline ejecuta lint backend/frontend, tests, coverage, build, migraciones de validación y `npm audit --omit=dev` | 5 | Media | S09 | Por iniciar | Crear `.github/workflows/ci.yml` y documentación de ramas |
| DMC-035 | Task | Preparar observabilidad, backup y carga | Como equipo, necesito saber si el sistema funciona y recuperarlo | Hay logs estructurados sin secretos, métricas/alertas, backup automático, prueba de restore y prueba de concurrencia/carga con datos representativos | 8 | Media | S09 | Por iniciar | Crear scripts y documentos de operación |
| DMC-036 | Story | Ejecutar piloto E2E y cerrar la entrega | Como equipo Capstone, necesito demostrar el flujo completo | Un caso recorre intake → categorización → matching → asignación → contacto/tratamiento → completado/cancelado; se adjuntan capturas, resultados y manual | 8 | Alta | S09 | Por iniciar | `README.md`, `docs/`, `tests/`; paquete final de evidencias se prepara en S09 |

### Checklist: código/evidencia ya presente en este repo

`[x]` indica que se encontró código o un artefacto relacionado en el árbol de Capstone; no certifica que se cumplan todos los criterios de aceptación. `[ ]` indica que la capacidad no está implementada o que falta la evidencia especificada. El formato de lista permite que GitHub renderice casillas. Esta checklist **no reemplaza** el campo `Estado planificado`; ninguna historia se declara aceptada aquí.

- [x] **DMC-001 — Visión, actores y alcance:** presentes en `README.md` y `docs/PRODUCT.md`.
- [x] **DMC-002 — Arquitectura modular hexagonal:** backend organizado en dominio, aplicación, adaptadores e infraestructura.
- [x] **DMC-003 — Esquema MySQL:** tres archivos de migración versionados; ejecutar sobre DB limpia sigue pendiente.
- [x] **DMC-004 — Ejecución local y Docker:** scripts, Dockerfile, Compose y `.env.example` presentes; arranque completo y validación con variables siguen pendientes.
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
- [x] **DMC-015 — Gestión de pacientes/estudiantes:** páginas y rutas presentes.
- [x] **DMC-016 — Catálogos e integridad:** normalización, reglas de dominio, claves foráneas e índices presentes.
- [x] **DMC-017 — Pre-categorización:** reglas deterministas y fallback ante falla del agente implementados.
- [x] **DMC-018 — Matching ponderado:** pesos 30/25/20/15/5/5, score y factores explicables implementados; hay pruebas unitarias.
- [x] **DMC-019 — Filtros de candidatos:** elegibilidad, disponibilidad y capacidad implementadas en repositorio/servicio.
- [x] **DMC-020 — Matching transaccional:** control de capacidad y lock masivo presentes; hay pruebas unitarias.
- [x] **DMC-021 — Estados de asignación:** política de transiciones implementada.
- [x] **DMC-022 — Mis asignaciones:** vista y ruta con permisos de estudiante presentes.
- [x] **DMC-023 — Operación de asignaciones:** vista administrativa y endpoints presentes.
- [x] **DMC-024 — Sincronización de carga/estado:** lógica del ciclo de vida implementada.
- [x] **DMC-025 — Dashboard:** interfaz y consultas de métricas presentes.
- [x] **DMC-026 — Matching operativo:** rutas y vista de pendientes, estadísticas, pesos y ejecución automática presentes.
- [x] **DMC-027 — Outbox:** cola y pantalla de consulta presentes; falta worker/proveedor para enviar correos reales.
- [x] **DMC-028 — Agente IA:** servicio Python, endpoint y adaptador presentes; el prompt ahora obtiene el número de claves desde `REQUIRED_FEATURES` (23 en el contrato actual) y el self-check comprueba la consistencia. Falta validar una llamada real al LLM.
- [x] **DMC-029 — Sistema visual:** componentes y estilos presentes; falta revisión completa de accesibilidad/responsive.
- [x] **DMC-030 — Estados de red del cliente:** cliente API, refresh de sesión y componentes loading/error/vacío presentes.
- [x] **DMC-031 — Pruebas:** pruebas unitarias e integración están en `tests/`; en Capstone pasan 48/48 y el coverage global supera los umbrales configurados. La aceptación completa aún requiere cerrar el lint del backend, que no encuentra configuración versionada en este repo.
- [ ] **DMC-032 — Hardening/privacidad:** faltan controles formales de producción, retención/anonimización, backup probado y revisión legal; además `npm --prefix client audit --omit=dev` reporta 2 vulnerabilidades altas en React Router que requieren revisión/actualización antes de exponer la demo.
- [ ] **DMC-033 — Worker de correo:** no existe worker real ni integración confirmada con proveedor.
- [ ] **DMC-034 — CI/CD:** no se encontró workflow en `.github/workflows/`.
- [ ] **DMC-035 — Observabilidad/backup/carga:** faltan implementación y evidencia de pruebas.
- [ ] **DMC-036 — Piloto E2E y entrega:** falta ejecutar y guardar evidencia del flujo completo y la presentación final.

#### Validaciones ejecutadas para este corte en Capstone

- [x] `npm ci` y `npm --prefix client ci`: instalación reproducible completada desde los lockfiles.
- [x] `npm test -- --runInBand`: pasan 6 suites y 48 pruebas en el checkout de Capstone.
- [x] `npm run test:coverage -- --runInBand`: 92.77% statements, 83.33% branches, 89.13% functions y 97.14% lines; supera el mínimo configurado de 80% en cada métrica global.
- [ ] `npm run lint`: no pasa en un clon limpio de Capstone porque no hay `.eslintrc.json` versionado. Usando como configuración temporal el archivo local del repo fuente, ESLint sí pasa; falta incorporar/versionar el archivo en Capstone.
- [x] `npm --prefix client run lint` y `npm --prefix client run build`: ambos pasan.
- [x] `npm audit --omit=dev` en backend: 0 vulnerabilidades reportadas.
- [ ] `npm --prefix client audit --omit=dev`: reporta 2 vulnerabilidades altas asociadas a `react-router`; revisar el advisory y actualizar a una versión corregida.
- [x] `docker compose config --quiet`: pasa con variables temporales de revisión; no se creó ni guardó un `.env` ni secretos reales.
- [x] `python -m ai_agent.agent`: self-check de parseo/normalización y consistencia del conteo de claves aprobado con un LLM simulado; **no** comprueba una llamada real a un proveedor.
- [ ] `docker compose up --build`, migraciones contra MySQL limpio, `GET /api/health`, llamada real al LLM y despliegue público: aún no ejecutados.

#### Pendiente para poder afirmar aceptación del MVP

- [ ] Cerrar DMC-028: cambios locales alinean ambas instrucciones con `REQUIRED_FEATURES`; falta probar respuesta real con un LLM configurado, usando datos sintéticos, antes de aceptar el ticket.
- [ ] Resolver DMC-003/DMC-004: arrancar desde DB limpia, aplicar migraciones y demostrar `/api/health` con toda la composición levantada.
- [ ] Resolver DMC-020/DMC-021/DMC-024: validar matching, estados y capacidad contra MySQL real, además de las pruebas unitarias disponibles.
- [ ] Resolver DMC-029: revisar accesibilidad y responsive en la interfaz completa; hay componentes/estilos, pero la auditoría no se ejecutó aquí.
- [ ] Cerrar DMC-031/DoD de calidad: tests y coverage ya pasan en Capstone; falta versionar `.eslintrc.json` y conseguir que `npm run lint` pase desde clon limpio.
- [ ] Resolver DMC-032: revisar/actualizar React Router para quitar las 2 alertas altas del audit de producción del frontend, y dejar límites de uso para la API del LLM.
- [ ] Resolver DMC-036: realizar y guardar evidencia del flujo completo en navegador con datos sintéticos.
- [ ] Resolver DMC-032 a DMC-035 según alcance: privacidad/backup, worker real de correo, CI/CD y observabilidad/carga.

### Próxima tanda de commits propuesta — demo del agente esta semana y MVP al 15-10-2026

Esta es una propuesta de trabajo y asignación para tres integrantes, no un cambio de estados en el Jira remoto. Los issues siguen planificados como `Por iniciar` hasta que el equipo actualice el tablero y adjunte evidencia real.

1. **DMC-028 — cambio preparado localmente, pendiente de commit:** el prompt ya obtiene el conteo de `REQUIRED_FEATURES` y el self-check lo verifica; falta correr la prueba real del endpoint con respuesta estructurada. Commit sugerido: `fix(ai): alinear contrato y validar pre-categorizacion [DMC-028]`. La prueba externa debe usar respuestas sintéticas, no datos reales de pacientes.
2. **Tú — demo del agente, esta semana (21–27 sep):** desplegar una instancia temporal y privada del agente junto a la app para que la profesora pueda probar el flujo; configurar el proveedor LLM y los secretos solo en el panel del host, crear un usuario de demo, comprobar `/api/health` y ejecutar `scripts/check-ai-agent.js`. Registrar URL, fecha, resultado, modelo/proveedor y capturas sin secretos. Commit de evidencia sugerido: `docs(demo): registrar prueba temporal del agente [DMC-028 DMC-036]`.
3. **Integrante 1 — calidad/CI, antes del 30-sep:** incluir `.eslintrc.json` en el repo destino, resolver el lint backend, revisar/actualizar React Router según el audit y agregar workflow para lint, tests, coverage y build. Commits sugeridos: `chore(quality): versionar ESLint y cerrar vulnerabilidades [DMC-031 DMC-032]` y `ci: validar lint tests coverage y build [DMC-034]`.
4. **Integración de los tres — del 1 al 10-oct:** desplegar MySQL vacío, correr las migraciones y comprobar alta de admin; usar casos/estudiantes ficticios para recorrer intake → pre-categorización → matching → asignación → cambio de estado/cierre. Corregir solo fallas observadas. Commit sugerido: `test(mvp): validar flujo completo con MySQL y datos sintéticos [DMC-003 DMC-004 DMC-020 DMC-036]`.
5. **Tú, como integración — del 11 al 15-oct:** repetir smoke tests en el entorno desplegado, revisar permisos/errores/responsive del recorrido principal, guardar evidencia de resultados y límites conocidos, y confirmar con la profesora que el MVP se puede probar. Commit sugerido: `docs(mvp): cerrar evidencia y guía de demostración [DMC-029 DMC-030 DMC-036]`.

**Criterio para decir “MVP demostrable” a mediados de octubre:** URL accesible, login de demo, datos sintéticos, MySQL persistente/migrado, agente real probado y con fallback, recorrido desde intake hasta estado de asignación, tests/coverage/lint/build reproducibles y límites de privacidad explicados. Esto no equivale a habilitar operación clínica real ni a cerrar todo el alcance de 18 semanas.

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
