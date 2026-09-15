# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Pacientes que necesitan orientación y atención odontológica supervisada y llegan sin conocer el proceso.
- Estudiantes de odontología que necesitan casos clínicos compatibles con su especialidad, disponibilidad y carga académica.
- Coordinadores y administradores que gestionan pacientes, estudiantes, asignaciones, matching y notificaciones.

## Product Purpose

Dental Matching conecta casos de pacientes con estudiantes de odontología mediante información clínica estructurada, disponibilidad verificable y un algoritmo ponderado. El éxito del producto es que un paciente pueda registrar su caso con confianza y que un estudiante encuentre oportunidades clínicas relevantes sin fricción.

## Positioning

La asignación combina pre-categorización asistida por IA con reglas de matching trazables: la IA organiza la información como apoyo, mientras que el algoritmo usa especialidad, horario, carga y prioridad para construir una asignación explicable.

## Operating Context

La experiencia pública empieza en una landing y continúa con registro de paciente o estudiante. El paciente responde un triaje dinámico y recibe un número de caso y, cuando existe, un estudiante asignado. El estudiante registra especialidades y disponibilidad para recibir casos. Los coordinadores operan desde un panel autenticado con navegación lateral.

## Capabilities and Constraints

- Frontend React con Vite y React Router; backend Express separado.
- Rutas públicas: landing, registro de paciente, registro de estudiante e inicio de sesión.
- Rutas protegidas: dashboard, pacientes, estudiantes, matching, asignaciones, notificaciones y mis asignaciones.
- Los formularios, autenticación, triaje, matching y mensajes de error existentes deben conservar su comportamiento.
- No se deben inventar diagnósticos, testimonios, resultados clínicos ni promesas comerciales.

## Brand Commitments

- El nombre Dental Matching y el foco en odontología supervisada deben mantenerse.
- La voz debe ser clara, humana y tranquilizadora para pacientes; directa y útil para estudiantes y coordinadores.
- La interfaz debe hablar en español.

## Evidence on Hand

- Implementación actual en `client/src`, con componentes reutilizables, iconos propios, tokens y motion CSS.
- Flujos reales de registro y autenticación conectados al API existente.
- No hay fotografías, testimonios ni material de marca adicional; el rediseño no debe fabricarlos.

## Product Principles

- Primero claridad: cada pantalla debe responder qué es, qué sigue y por qué importa.
- La confianza se gana explicando el proceso y los límites de la IA.
- La información clínica merece calma, privacidad y estados de error recuperables.
- El matching debe sentirse útil y trazable, no mágico.
- La misma calidad visual debe acompañar al paciente, estudiante y equipo operativo.

## Accessibility & Inclusion

- Mantener navegación por teclado, foco visible, labels asociados, estados anunciados y soporte para `prefers-reduced-motion`.
- Formularios públicos legibles y utilizables en móvil, sin depender solo del color.
