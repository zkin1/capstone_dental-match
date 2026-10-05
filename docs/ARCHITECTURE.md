# Arquitectura del proyecto

Dental Match usa un monolito modular con arquitectura hexagonal. El matching, la capacidad y las derivaciones se mantienen consistentes mediante transacciones y bloqueos de PostgreSQL.

## Mapa de la raíz

```text
server.js                 punto de entrada del API
src/                      runtime Node organizado por capas
client/                   SPA React/Vite
ai_agent/                 adaptador Python opcional para pre-categorización
scripts/                  migraciones y tareas operativas
tests/                    pruebas fuera del runtime
docs/                     producto, diseño y arquitectura
legacy/public/            frontend estático antiguo, solo fallback
research/ml_model/       investigación de modelos, no runtime
research/benchmark/      experimentos y mediciones, no runtime
data/local/              datasets descargados, ignorados por Git
```

## Capas del backend

```text
src/
├── domain/
│   ├── common.js
│   └── matching/scoring.js
├── application/
│   ├── auth/
│   ├── patients/
│   ├── students/
│   ├── assignments/
│   ├── dashboard/
│   ├── notifications/
│   └── matching/
├── adapters/
│   ├── inbound/http/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   └── outbound/
│       ├── ai/
│       ├── email/
│       ├── persistence/postgres/
│       └── security/
├── infrastructure/
│   ├── database/
│   │   └── migrations/
│   └── http/
└── shared/
    └── errors/
```

### Responsabilidades

- `domain`: reglas puras del negocio. No importa Express, PostgreSQL, `fetch` ni variables de entorno.
- `application`: casos de uso y coordinación de reglas. Debe depender de puertos, no de detalles de infraestructura.
- `adapters/inbound`: convierte HTTP en comandos de aplicación y resultados de aplicación en respuestas HTTP.
- `adapters/outbound`: implementa los puertos para PostgreSQL, IA, correo u otros servicios externos.
- `infrastructure`: composición de dependencias, conexión de base de datos, migraciones y arranque HTTP.
- `shared`: errores y utilidades verdaderamente transversales; no debe convertirse en un cajón de sastre.

## Flujo permitido

```text
HTTP route/controller
        ↓
Application use case
        ↓
Domain rules + ports
        ↓
Outbound adapters (PostgreSQL, IA, email)
```

Las rutas no deben contener SQL, reglas de matching, llamadas directas al LLM ni transacciones de negocio. Las consultas viven en `src/adapters/outbound/persistence/postgres/` y los casos de uso coordinan validaciones, reglas y efectos.

## Decisiones de negocio

- La IA solo pre-categoriza y siempre tiene fallback determinista.
- El matching es una regla de dominio explicable y no depende de un LLM.
- PostgreSQL es la fuente de verdad para capacidad, estados, asignaciones, historial y derivaciones.
- Las notificaciones se escriben primero en el outbox; un worker separado debe enviarlas y reintentarlas.

## Persistencia y migraciones

`src/infrastructure/database/connection.js` usa el pool de `pg`. Acepta `DATABASE_URL` o las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. `DB_SCHEMA` selecciona el esquema (por defecto `dental_match`) mediante `search_path`; las fechas se guardan en UTC y las citas se interpretan en la zona local chilena.

`npm run migrate` aplica las migraciones versionadas y registra versión y checksum en `schema_migrations`; `npm run migrate:status` muestra las pendientes. Las migraciones actuales crean la base PostgreSQL y agregan seguimiento, historial y derivaciones. Para pruebas se crea un esquema temporal local que se elimina al terminar; CI utiliza una instancia PostgreSQL de prueba.

La transacción de asignación bloquea el paciente y los cupos antes de actualizar la carga y encolar avisos. Las revisiones de derivación también se realizan dentro de una transacción: aprobar libera el cupo de origen una sola vez y busca un receptor compatible. El script de importación desde MySQL es una herramienta de migración histórica; el runtime usa PostgreSQL.

## Regla para cambios nuevos

Antes de agregar código, identificar:

1. qué regla pertenece al dominio;
2. qué caso de uso la coordina;
3. qué entrada HTTP la invoca;
4. qué adaptador externo persiste o comunica el resultado.

Si un archivo necesita conocer simultáneamente Express, SQL y una regla clínica, está cruzando capas y debe dividirse.

## Estado de la refactorización

La estructura física y los tres flujos principales ya están separados: `patients.routes.js`, `students.routes.js` y `assignments.routes.js` solo traducen HTTP y delegan en casos de uso. Sus consultas viven en repositorios PostgreSQL y sus validaciones/transiciones en dominio o aplicación.

Los repositorios PostgreSQL, incluido `matching.repository.js`, están fuera de los casos de uso. Las rutas componen los servicios existentes; centralizar esa composición es una mejora opcional de organización.
