# Arquitectura del proyecto

Dental Matching usa un monolito modular con arquitectura hexagonal. La decisión es intencional: el matching necesita transacciones consistentes con MySQL y el proyecto todavía no necesita la complejidad operativa de varios servicios.

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
│       ├── persistence/mysql/
│       └── security/
├── infrastructure/
│   ├── database/
│   │   └── migrations/
│   └── http/
└── shared/
    └── errors/
```

### Responsabilidades

- `domain`: reglas puras del negocio. No importa Express, MySQL, `fetch` ni variables de entorno.
- `application`: casos de uso y coordinación de reglas. Debe depender de puertos, no de detalles de infraestructura.
- `adapters/inbound`: convierte HTTP en comandos de aplicación y resultados de aplicación en respuestas HTTP.
- `adapters/outbound`: implementa los puertos para MySQL, IA, correo u otros servicios externos.
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
Outbound adapters (MySQL, IA, email)
```

Las rutas no deben contener SQL, reglas de matching, llamadas directas al LLM ni transacciones de negocio. Las consultas viven en repositorios/adaptadores MySQL y los casos de uso coordinan validaciones, reglas y efectos.

## Decisiones de negocio

- La IA solo pre-categoriza y siempre tiene fallback determinista.
- El matching es una regla de dominio explicable y no depende de un LLM.
- MySQL sigue siendo la fuente de verdad para capacidad, estados y asignaciones.
- Las notificaciones se escriben primero en el outbox; un worker separado debe enviarlas y reintentarlas.

## Regla para cambios nuevos

Antes de agregar código, identificar:

1. qué regla pertenece al dominio;
2. qué caso de uso la coordina;
3. qué entrada HTTP la invoca;
4. qué adaptador externo persiste o comunica el resultado.

Si un archivo necesita conocer simultáneamente Express, SQL y una regla clínica, está cruzando capas y debe dividirse.

## Estado de la refactorización

La estructura física y los tres flujos principales ya están separados: `patients.routes.js`, `students.routes.js` y `assignments.routes.js` solo traducen HTTP y delegan en casos de uso. Sus consultas viven en repositorios MySQL y sus validaciones/transiciones en dominio o aplicación.

El siguiente paso para una hexagonal todavía más estricta es centralizar toda la composición de dependencias en un único contenedor de infraestructura. Los repositorios MySQL, incluido `matching.repository.js`, ya están fuera de los casos de uso; este último ajuste mejora organización y testabilidad, pero no es necesario para la demo actual.
