# Plan de implementación: seguimiento y derivaciones

Fecha: 3 de octubre de 2026. Proyecto: Dental Match Capstone.

Estado: implementado. Resultados y activación en [la guía de seguimiento](SEGUIMIENTO_DERIVACIONES.md).

## Alcance y orden

1. Añadir una migración incremental para derivaciones, precalificación validada e historial. Conservar los datos actuales; registrar un punto de partida de las asignaciones antiguas sin inventar eventos anteriores.
2. Exponer el detalle del caso al estudiante asignado y al personal autorizado: contacto, cuestionario, propuesta del sistema, clasificación validada e historial con fecha y responsable.
3. Guardar cambios de estado y notas como eventos. El estudiante propone una derivación después del contacto o durante el tratamiento. El administrador/coordinador confirma o corrige especialidad, tratamiento, prioridad y motivo, o rechaza la propuesta.
4. Al aprobar, cerrar la asignación de origen, liberar su cupo y buscar un receptor compatible. Si no hay cupo, conservar el paciente pendiente. Añadir asignación y reasignación manual con las mismas restricciones.
5. Crear gestión de cuentas y roles exclusiva del administrador. Comprobar el rol y el estado actuales en cada petición y proteger al último administrador activo.
6. Implementar envío y reintento de la cola de correo mediante un proveedor configurable y un trabajador. Añadir acciones en pantalla y conservar intentos y errores.
7. Corregir el timeout del agente y configurar ESLint. Comprobar backend, migraciones, frontend y permisos con datos sintéticos.

## Reparto de pacientes derivados

Solo se aplica a una derivación aprobada. Primero se filtran especialidad, clínica, ciudad, horario, cuenta activa y capacidad disponible. Entre los elegibles:

1. Menor cantidad de pacientes activos.
2. A igual carga, mayor cantidad de pacientes distintos derivados y aprobados.
3. Mayor puntaje de compatibilidad y, finalmente, identificador estable.

El receptor no puede ser un estudiante que ya derivó ese mismo paciente. Una derivación pendiente o rechazada no da crédito. Un mismo estudiante solo obtiene crédito una vez por paciente. La clasificación aprobada prevalece sobre la sugerencia automática. Se guarda la explicación del reparto en la asignación.

## Revisión de riesgos antes de implementar

| Riesgo | Control previsto | Comprobación |
|---|---|---|
| Dos asignaciones activas o sobrecupo | Bloqueo del paciente, transacciones y restricción única; reservar cupo antes del alta | Asignaciones concurrentes y rechazo sin capacidad |
| Liberar cupo dos veces | Aprobar/rechazar solo una propuesta pendiente y cerrar origen en la misma transacción | Doble aprobación y estados terminales |
| Premiar derivaciones innecesarias | Validación del personal, crédito por paciente distinto y exclusión de anteriores derivadores | Rechazo, repetición y desempate |
| Perder notas | Historial insertado en la transacción de cada cambio | Varias notas y responsable |
| Acceso a casos ajenos | Comprobar propiedad antes de devolver detalle o modificar | Estudiante ajeno y personal autorizado |
| Roles antiguos en una sesión | Consultar cuenta vigente en cada petición | Suspensión y cambio de rol |
| Duplicar correo en reintentos | Reclamo exclusivo e identificador de idempotencia del proveedor | Reclamo concurrente y fallos de envío |
| Timeout de IA impide alta | Adaptador devuelve fallback y servicio tolera error de disponibilidad | AbortError y alta posterior |

Estas decisiones resuelven los fallos identificados en el diseño; las pruebas posteriores aportarán evidencia de la implementación. No se puede garantizar ausencia absoluta de errores.

## Límites

Se implementa en este repositorio por solicitud expresa del usuario, tomando `dental_matching_IA` como referencia. No se modifica el repositorio principal ni se crean historias nuevas en el backlog. No se envían correos reales ni se modifica una base alojada durante las verificaciones. La clasificación es una propuesta de tratamiento que requiere revisión clínica.
