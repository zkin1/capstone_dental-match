# Dental Matching

Demo de asignación de pacientes odontológicos a estudiantes de odontología clínica. El sistema recibe el caso del paciente, obtiene una pre-categorización opcional y asigna el caso mediante reglas deterministas de negocio. La inteligencia artificial no decide el matching.

Este documento es la fuente única de verdad del proyecto: describe la arquitectura, el flujo funcional, las reglas, la base de datos, la seguridad, el frontend, los comandos y las limitaciones conocidas.

## 1. Objetivo y alcance

El producto conecta pacientes que solicitan atención odontológica con estudiantes que tienen disponibilidad, especialidad y capacidad para atenderlos bajo supervisión clínica.

La demo cubre:

- alta pública de pacientes con consentimiento explícito;
- pre-categorización opcional mediante un agente IA;
- matching ponderado y explicable;
- registro público de estudiantes y mantenimiento de sus disponibilidades;
- login, roles y sesiones mediante cookies seguras;
- control de capacidad y carga activa;
- transiciones de estado de las asignaciones;
- dashboard de operación;
- cola de notificaciones tipo outbox;
- migraciones PostgreSQL reproducibles;
- frontend React/Vite con el mismo sistema visual en todas las pantallas.

No es un sistema de diagnóstico médico. La categoría sirve para triaje operativo y asignación; la valoración clínica definitiva corresponde al equipo odontológico.

## 2. Arquitectura actual

```text
Navegador
   │
   ▼
Frontend React/Vite
   │  HTTP + cookies HttpOnly
   ▼
Express BFF / monolito modular
   ├── Auth
   ├── Pacientes
   ├── Estudiantes
   ├── Matching
   ├── Asignaciones
   ├── Dashboard
   └── Notificaciones
   │
   ├── PostgreSQL privado: datos, transacciones, migraciones y outbox
   └── AI Agent opcional: solo pre-categorización
```

El navegador nunca se conecta directamente a PostgreSQL ni conoce credenciales de base de datos. El BFF es el único punto de entrada HTTP y el monolito modular concentra la lógica transaccional.

### Estructura principal

```text
server.js                              arranque, entorno y ciclo de vida
src/domain                             reglas puras del negocio, sin I/O
src/application                       casos de uso y orquestación por módulo
src/adapters/inbound/http              rutas, controladores y middleware HTTP
src/adapters/outbound                  PostgreSQL, agente IA y servicios externos
src/infrastructure                     conexión PostgreSQL, migraciones y composición HTTP
client/src                             SPA React, componentes y páginas
ai_agent                               servicio Python opcional de pre-categorización
tests                                  pruebas unitarias e integración HTTP
scripts                                migraciones y tareas operativas
docs                                   diseño, producto y arquitectura
legacy/public                         frontend estático anterior, solo fallback
research/ml_model, research/benchmark investigación y experimentos fuera del runtime
data/local                            datasets descargados locales, ignorados por Git
```

Las antiguas capas duplicadas y el frontend estático anterior ya no forman parte del flujo principal. La lógica oficial vive en `src/domain`, `src/application` y sus adaptadores. `legacy/public` se conserva solo como fallback para instalaciones que todavía no han construido `client/dist`.

## 3. Qué se hizo en la refactorización

- Se consolidó el backend en un BFF Express y un monolito modular vertical.
- Se separaron los módulos por capacidad de negocio para evitar rutas y servicios duplicados.
- Se eliminó la dependencia del frontend respecto de tokens guardados en `localStorage`.
- Se implementaron cookies HttpOnly para access y refresh token; el refresh token se persiste solo como hash.
- Se centralizaron estados, roles, especialidades, prioridades y normalizadores en `src/domain/common.js`.
- Se movió el cálculo puro del matching a `src/domain/matching/scoring.js`, separado de la persistencia y la API.
- Se separaron las entradas HTTP, los casos de uso, los adaptadores de salida y la infraestructura para hacer explícito el flujo hexagonal.
- Se extrajeron pacientes, estudiantes y asignaciones a validaciones de dominio, servicios de aplicación y repositorios PostgreSQL; sus rutas ahora solo traducen HTTP.
- Se convirtió el matching en un algoritmo determinista, auditable y transaccional.
- Se añadieron bloqueos de filas y control de asignación activa única por paciente.
- Se separaron las migraciones nuevas de los cambios de endurecimiento del esquema legacy.
- Se corrigieron longitudes de campos que podían impedir la creación de claves foráneas o guardar datos válidos.
- Se añadieron límites de rate, tamaño de body, helmet, compresión, request id y validaciones de entrada.
- Se alineó el frontend con contratos del BFF, estados de carga/error/vacío y componentes accesibles.
- Se limpió el `package.json` de dependencias directas que ya no se utilizaban y se dejó `npm audit --omit=dev` sin vulnerabilidades.
- Se dejó Docker con PostgreSQL privado, secretos obligatorios, healthchecks y red interna para la comunicación con el agente IA.

## 4. Regla central: IA fuera del matching

El flujo obligatorio es:

```text
Respuestas del paciente
        │
        ▼
Pre-categorización IA opcional
        │  timeout/error => fallback determinista
        ▼
Paciente persistido con categoría y prioridad
        │
        ▼
Algoritmo de matching por pesos
        │
        ▼
Asignación explicable o caso pendiente
```

El agente IA recibe respuestas clínicas del formulario y devuelve una sugerencia estructurada. La API del agente tiene timeout y su fallo no bloquea el registro. Si la IA no responde, el intake conserva las respuestas originales y el servicio de matching aplica la categorización determinista mediante `scorePatientCategory`.

El matching no llama al LLM, no interpreta texto libre y no cambia sus pesos según una respuesta del modelo. Por lo tanto, una misma entrada y el mismo conjunto de candidatos producen el mismo orden de candidatos.

## 5. Reglas de pre-categorización

La pre-categorización es una ayuda de triaje, no un diagnóstico.

Reglas deterministas de fallback implementadas:

| Señal del cuestionario | Categoría | Prioridad / señal |
|---|---|---|
| fiebre, hinchazón importante o infección | Endodoncia | Muy alta / posible red flag |
| sangrado o inflamación de encías | Periodoncia | Alta |
| dolor pulsátil o sensibilidad pulpar | Endodoncia | Alta |
| diente fracturado o pérdida de estructura | Prótesis Fija | Media/alta |
| caries o lesión restaurable | Operatoria | Media |
| paciente menor de 18 años | Odontopediatría | La edad prevalece sobre la categoría general |
| sin señal suficiente | Operatoria | Normal |

La categoría y prioridad se almacenan junto al caso para poder auditar la decisión y no depender de volver a ejecutar la IA.

## 6. Algoritmo de matching

Los pesos actuales suman exactamente 100%:

| Factor | Peso | Qué mide |
|---|---:|---|
| compatibilidad horaria | 30% | coincidencia entre disponibilidad del estudiante y fecha/hora propuesta |
| especialidad | 25% | coincidencia de la categoría del paciente con una especialidad habilitada |
| carga disponible | 20% | capacidad restante del estudiante |
| prioridad | 15% | urgencia y prioridad operativa del paciente |
| dolor | 5% | nivel de dolor declarado |
| experiencia | 5% | experiencia relevante del estudiante |

Cada candidato recibe un factor normalizado y el score se calcula como:

```text
score = horario*0.30
      + especialidad*0.25
      + carga*0.20
      + prioridad*0.15
      + dolor*0.05
      + experiencia*0.05
```

### Filtros duros antes de puntuar

Un candidato no se puntúa si:

- el estudiante no está activo;
- no tiene la especialidad requerida;
- no posee capacidad disponible;
- no existe una disponibilidad compatible con la fecha/hora del paciente;
- el paciente ya tiene una asignación activa;
- la asignación sería incompatible con las reglas de clínica configuradas.

La falta de candidato compatible no es un error técnico ni una asignación inventada: el paciente queda pendiente para revisión o una futura ejecución.

### Desempate y auditoría

Los candidatos se ordenan por score descendente y se aplica un desempate estable para que el resultado no dependa del orden accidental de PostgreSQL. Cada asignación guarda el score y los factores que lo produjeron.

El resultado se puede explicar como: “este estudiante fue elegido por coincidencia horaria, especialidad, capacidad, prioridad, dolor y experiencia”, mostrando los valores persistidos.

### Concurrencia

La asignación se ejecuta dentro de una transacción:

1. bloquea el paciente;
2. comprueba que no exista una asignación activa;
3. bloquea los candidatos relevantes;
4. vuelve a comprobar capacidad y disponibilidad;
5. crea la asignación y actualiza la carga;
6. encola la notificación;
7. confirma todo junto.

La ejecución masiva utiliza un bloqueo de base de datos para impedir que dos procesos asignen el mismo caso simultáneamente.

## 7. Estados y transiciones de negocio

Las asignaciones utilizan estos estados:

```text
asignado ──→ notificado ──→ contactado ──→ en_tratamiento ──→ completado
    │              │              │                │
    ├──────────────┴──────────────┴────────────────┴──→ cancelado
    └──────────────────────────────→ contactado
```

Reglas:

- solo se permiten transiciones válidas; desde `asignado` se puede pasar a `notificado`, `contactado` o `cancelado`;
- `completado` y `cancelado` son estados terminales;
- una asignación cancelada no se reactiva: se crea una nueva si procede;
- una asignación completada incrementa los casos completados del estudiante;
- una asignación activa ocupa capacidad;
- al completar o cancelar se libera la carga activa;
- al pasar a `completado`, el paciente queda resuelto;
- al pasar a `cancelado`, el paciente vuelve a pendiente si todavía necesita atención;
- todas las actualizaciones relevantes ocurren de forma transaccional.

La API rechaza cambios de estado imposibles en vez de corregirlos silenciosamente.

## 8. Reglas de pacientes

- El intake público exige consentimiento explícito.
- Se validan nombre, email, teléfono, fecha de nacimiento/edad, ciudad y respuestas del cuestionario.
- La edad se normaliza y se usa para restricciones clínicas y pre-categorización.
- El email se normaliza a minúsculas y se validan límites de longitud.
- El paciente se crea con estado pendiente cuando no existe una asignación inmediata.
- No se borra físicamente un caso operativo; las operaciones de negocio son desactivación, cancelación o cambio de estado.
- Un paciente no puede tener más de una asignación activa gracias a la combinación de transacción, bloqueo y restricción única.

## 9. Reglas de estudiantes

- El registro público crea el perfil y sus disponibilidades dentro de una transacción.
- El correo debe ser único y el password se almacena con hash.
- El estudiante debe tener al menos una especialidad/disponibilidad válida para poder ser candidato.
- Cada disponibilidad define especialidad, clínica, día, horario y capacidad.
- `casos_activos` nunca puede superar `casos_necesarios`.
- Las operaciones de administración pueden activar, desactivar o actualizar un perfil.
- Un estudiante inactivo no entra al matching aunque conserve datos históricos.

## 10. Modelo de datos

El esquema canónico se crea desde `src/infrastructure/database/migrations/`.

### Tablas principales

| Tabla | Responsabilidad |
|---|---|
| `users` | credenciales, rol, estado de usuario y hash de refresh token |
| `estudiantes_odontologia` | perfil, estado, carga activa y casos completados |
| `especialidades_estudiante` | especialidad, clínica, disponibilidad y capacidad |
| `pacientes` | identidad, contacto, consentimiento, cuestionario, categoría, prioridad y estado |
| `asignaciones` | relación paciente-estudiante, fecha/hora, score, factores y estado |
| `notificaciones_email` | outbox transaccional para notificaciones pendientes/enviadas/fallidas |
| `schema_migrations` | versiones de migraciones aplicadas |

### Integridad importante

- claves foráneas entre pacientes, estudiantes, usuarios y asignaciones;
- email normalizado y con longitud compatible con las claves existentes;
- índice único parcial sobre `id_paciente` para impedir dos asignaciones activas;
- índices para estado, categoría, prioridad, disponibilidad y fechas de operación;
- constraints y validación de aplicación para estados y capacidades;
- datos de auditoría de score, factores, fechas y cambios de estado.

### Migraciones aplicadas

1. `20260922000001_postgresql_baseline.js`: esquema PostgreSQL canónico, relaciones, checks e índices.

La copia desde la base anterior se detiene si el destino ya contiene datos o si el origen no coincide con el esquema esperado. El estado debe verificarse siempre con `npm run migrate:status` en cada entorno.

## 11. Flujos completos

### Alta de paciente

1. El frontend envía el formulario al BFF.
2. El BFF aplica rate limit, límite de body y validación.
3. Se comprueba el consentimiento.
4. Se intenta la pre-categorización del agente IA.
5. Si el agente falla, se utiliza fallback determinista.
6. Se guarda el paciente y la pre-categorización.
7. Se intenta el matching transaccional.
8. Si hay candidato, se crea la asignación y el outbox.
9. Si no hay candidato, se devuelve estado pendiente sin falsear una asignación.

### Registro de estudiante

1. El estudiante envía perfil, password, especialidades y disponibilidades.
2. Se normalizan email, horarios y capacidades.
3. Se valida que no existan duplicados incompatibles.
4. Se crean usuario, perfil y disponibilidades en una transacción.
5. El estudiante queda activo al terminar correctamente el registro; posteriormente staff puede actualizarlo o desactivarlo.

### Login y sesión

1. Login verifica email y password.
2. El backend emite access y refresh token en cookies HttpOnly.
3. El refresh token persistido es un hash, no el token original.
4. La renovación rota el refresh token.
5. Logout invalida la sesión y limpia las cookies.
6. Las rutas protegidas se autorizan por autenticación y rol.

### Matching manual o automático

1. Un administrador/coordinador solicita candidatos, pesos o ejecución automática.
2. El servicio carga pacientes pendientes y estudiantes elegibles.
3. Aplica filtros duros.
4. Calcula pesos, ordena y persiste el mejor resultado.
5. Guarda factores y score.
6. Actualiza capacidad y outbox en la misma transacción.

## 12. API del BFF

Todas las rutas se sirven bajo `/api`.

### Salud y metadatos

- `GET /api/health`
- `GET /api/info`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/validate-token`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `PUT /api/auth/change-password`
- `POST /api/auth/register` — admin
- `GET /api/auth/roles` — admin

### Pacientes

- `POST /api/pacientes/intake` — público
- `GET /api/pacientes` — staff
- `GET /api/pacientes/stats` — staff
- `POST /api/pacientes` — staff
- `PUT /api/pacientes/:id` — staff
- `DELETE /api/pacientes/:id` — staff, desactivación de negocio

### Estudiantes

- `POST /api/estudiantes/register` — público
- `GET /api/estudiantes` — staff
- `GET /api/estudiantes/stats` — staff
- `PUT /api/estudiantes/:id` — staff
- `DELETE /api/estudiantes/:id` — staff, desactivación de negocio

### Matching y operación

- `GET /api/matching/weights`
- `GET /api/matching/stats`
- `GET /api/matching/pending`
- `POST /api/matching/auto` — admin/coordinador
- `GET /api/asignaciones`
- `GET /api/asignaciones/mias` — estudiante
- `GET /api/asignaciones/stats`
- `PUT /api/asignaciones/:id`
- `DELETE /api/asignaciones/:id` — cancelación de negocio
- `GET /api/dashboard/stats` — admin/coordinador
- `GET /api/notificaciones` — admin/coordinador

## 13. Frontend y UX/UI

El frontend vive en `client/` y se sirve como build estático desde Express cuando existe `client/dist`.

Pantallas principales:

- landing pública;
- registro de paciente;
- registro de estudiante;
- login;
- dashboard;
- pacientes;
- estudiantes;
- matching;
- asignaciones;
- mis asignaciones;
- notificaciones.

El sistema visual usa una personalidad clínica, confiable y eficiente:

- base azul/teal sobre fondos claros;
- tipografía Inter y escala consistente;
- espaciado base de 4 px;
- breakpoints comunes en 640, 768 y 1024 px;
- targets táctiles de al menos 44 px;
- contraste WCAG AA para textos y controles;
- inputs de al menos 16 px para evitar zoom móvil;
- `prefers-reduced-motion` respetado;
- sidebar responsive y navegable por teclado;
- un `h1` por página y títulos de documento por ruta;
- labels asociados, `aria-invalid`, mensajes de error y foco visible;
- tablas que se convierten en tarjetas en pantallas pequeñas;
- modales con `role=dialog`, foco controlado y cierre con Escape;
- estados de carga, error y vacío con componentes reutilizables;
- colores de estado acompañados siempre por texto, nunca solo por color.

La fuente de tokens está en `client/src/styles/tokens.css`; el espejo para componentes está en `client/src/styles/design-system.ts`.

## 14. Seguridad

- PostgreSQL queda en red privada y no se publica al host en Docker.
- El navegador no recibe tokens en JSON ni credenciales de DB.
- Las cookies son HttpOnly y usan configuración segura según el entorno.
- Los refresh tokens se almacenan como hash.
- Las rutas administrativas exigen autenticación y roles.
- El intake y el login tienen rate limit.
- El body de las peticiones tiene límite.
- Helmet, compresión, request id y manejo centralizado de errores están activos.
- Los secretos placeholder se rechazan en producción.
- No se registran passwords ni tokens completos.
- El agente IA se comunica por red interna y su caída no impide el fallback.
- Las operaciones destructivas del dominio son desactivaciones o cancelaciones auditables.

Esto no reemplaza una revisión de seguridad de producción: todavía deben completarse gestión de secretos, backup/restore, monitoreo y pruebas de penetración.

## 15. Instalación y ejecución

Requisitos:

- Node.js 20 o superior;
- PostgreSQL 17 o superior;
- Python 3.11 o superior solo si se ejecuta el agente IA.

Instalación:

```powershell
npm ci
npm --prefix client ci
Copy-Item .env.example .env
```

Completar `.env` con una base de datos existente y secretos aleatorios largos. Nunca subir `.env` ni credenciales reales.

Crear el primer administrador:

```powershell
$env:ADMIN_EMAIL = 'admin@example.cl'
$env:ADMIN_PASSWORD = 'UnaClaveLargaYUnica123!'
$env:ADMIN_NAME = 'Administrador Demo'
npm run db:create-admin
```

Migrar y ejecutar:

```powershell
npm run migrate:status
npm run migrate
npm run dev
```

Para una migración única desde la base MySQL anterior, configurar `MYSQL_SOURCE_*`, revisar primero el inventario y luego copiar:

```powershell
npm run db:inventory:mysql
npm run db:migrate:mysql
```

El esquema anterior, el esquema final y las reglas de conservación están documentados en `docs/DATABASE_MIGRATION.md`.

Frontend y backend en paralelo:

```powershell
npm run dev:full
```

Docker:

```powershell
docker compose up --build
```

Variables relevantes:

```text
NODE_ENV, HOST, PORT, TZ
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
DATABASE_URL, DB_SCHEMA, DB_CONNECTION_LIMIT
MYSQL_SOURCE_URL o MYSQL_SOURCE_HOST, MYSQL_SOURCE_PORT, MYSQL_SOURCE_DATABASE, MYSQL_SOURCE_USER, MYSQL_SOURCE_PASSWORD
JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
AI_AGENT_URL
LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
```

En la configuración actual se usa `TZ=America/Santiago` para fechas y horarios de negocio. No cambiar la zona horaria sin revisar disponibilidad, próximas fechas y reportes.

## 16. Verificación realizada

Comandos de validación disponibles:

```powershell
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run lint
npm run validate
npm --prefix client run lint
npm --prefix client run build
npm audit --omit=dev
npm run migrate:status
npm run test:ai-agent
docker compose config --quiet
```

`npm run test:ai-agent` es un chequeo en vivo: consulta `/health` y ejecuta una pre-categorización real contra `AI_AGENT_URL`. No forma parte de `npm test` porque requiere que el agente y su LLM estén levantados.

Con Docker, ejecútalo dentro del contenedor de la app para usar la red interna:

```powershell
docker exec dental_matching_ia-app-1 node scripts/check-ai-agent.js
```

La validación ejecutada durante la refactorización confirmó:

- 48 pruebas pasando;
- cobertura del núcleo sobre los umbrales configurados;
- lint del backend correcto;
- lint y build del frontend correctos;
- `npm audit --omit=dev` sin vulnerabilidades de producción;
- configuración Docker válida con secretos de entorno presentes;
- migraciones sin pendientes;
- health e info del BFF respondiendo;
- rutas protegidas devolviendo `401` sin sesión.

## 17. Limitaciones y siguientes pasos reales

La demo ya tiene el flujo funcional, pero antes de producción hay que completar:

- worker que consuma y reintente `notificaciones_email`;
- proveedor real de correo y plantillas versionadas;
- backup y prueba de restauración de PostgreSQL;
- secretos gestionados fuera de archivos locales;
- CI con lint, tests, migraciones y build;
- observabilidad con logs estructurados, métricas y alertas;
- política de retención y anonimización de datos personales;
- pruebas de carga y concurrencia con datos representativos;
- revisión legal y de consentimiento para datos clínicos;
- prueba de recuperación ante caída del agente IA y de la base de datos;
- criterios operativos para reintentar pacientes pendientes;
- auditoría de cambios de roles, estados y capacidad.

Los directorios `research/ml_model/` y `research/benchmark/` se conservan como investigación histórica. No participan en el runtime, no llaman al matching y no deben tratarse como fuente de reglas de negocio.

## 18. Cómo modificar el sistema sin romperlo

### Cambiar pesos

Modificar la configuración central del módulo matching, comprobar que la suma sea 1 o 100%, actualizar las pruebas de score y revisar el endpoint de explicación. Nunca introducir un peso escondido dentro de una ruta.

### Cambiar estados

Actualizar las constantes de dominio, el validador de transición, la actualización de carga y las pruebas de terminalidad. Revisar también el frontend y los reportes.

### Cambiar el esquema

Crear una nueva migración incremental. No editar migraciones ya ejecutadas en entornos compartidos. Ejecutar status, migración, tests de integración y verificación de claves foráneas.

### Cambiar el formulario

Actualizar el contrato del frontend, validación BFF, fallback de pre-categorización, persistencia y pruebas. Los datos que influyen en matching deben tener una representación normalizada y documentada.

### Cambiar la IA

La IA solo puede enriquecer o pre-categorizar. No debe seleccionar estudiantes, modificar capacidad, crear asignaciones ni saltarse filtros duros. Ante timeout, respuesta inválida o indisponibilidad, el sistema debe seguir funcionando con fallback.
