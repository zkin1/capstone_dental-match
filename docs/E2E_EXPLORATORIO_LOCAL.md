# Recorrido exploratorio E2E local

Fecha: 5 de octubre de 2026. Proyecto: Dental Match Capstone.

Un agente recorrió la aplicación en el navegador integrado, leyendo cada pantalla y decidiendo el paso siguiente según el resultado visible. Se utilizaron clics, formularios, menús, navegación, cierres de sesión y recargas. Este recorrido complementa las suites automatizadas; aquí no se ejecutaron los scripts `test-browser.js` ni `test-system.js`.

## Entorno y datos

- Aplicación local: `http://127.0.0.1:60447`, build de Capstone servido por Express.
- PostgreSQL local en un esquema temporal inicialmente vacío. El entorno fue preparado con cuentas de administrador y coordinador ficticias.
- Todos los perfiles, contactos, pacientes, notas y tratamientos son sintéticos. No se utilizaron datos de producción.
- El proveedor IA estaba deliberadamente desconectado. El proveedor de correo no tenía credenciales.
- Navegador de escritorio y vista móvil de 390 × 844. El tamaño se restauró al finalizar.
- Al cerrar el recorrido, el servidor temporal quedó detenido y se eliminó el esquema de esta exploración, identificado por sus cuentas ficticias. La URL anterior corresponde únicamente a esta ejecución.

| Perfil o caso | Identificador ficticio | Uso |
| --- | --- | --- |
| Administrador | `admin@example.com` | Crear perfiles y pacientes, asignar, revisar derivación, cuentas y notificaciones |
| Coordinador | `coordinator@example.com` | Comprobar permisos y crear estudiante |
| Lucía Exploración Local | `lucia.explora@example.com` | Operatoria, máximo 3 casos, lunes 08:00–12:00; estudiante de origen |
| Mateo Exploración Local | `mateo.explora@example.com` | Endodoncia y Operatoria, máximo 3 casos, lunes 08:00–12:00; receptor |
| Sofía Coordinación Local | `sofia.coordinacion@example.com` | Perfil creado por coordinador, Endodoncia, martes 08:00–12:00 |
| Diego Registro Público | `diego.publico@example.com` | Registro público y acceso desde móvil, Operatoria, viernes 08:00–12:00 |
| Personal Exploración | `personal.explora@example.com` | Crear cuenta de coordinador y comprobar suspensión |
| CASO-000001 | `paciente.uno@example.com` | Recorrido clínico completo desde asignación hasta completado |
| CASO-000002 | `paciente.dos@example.com` | Matching con menor carga y cancelación de una asignación |
| CASO-000003 | `paciente.publico@example.com` | Cuestionario público con consentimiento y fallback |

## Recorrido y resultados visibles

| Escenario | Recorrido observado | Resultado |
| --- | --- | --- |
| Acceso y navegación administrativa | Iniciar sesión y navegar por estudiantes, pacientes, matching, derivaciones, cuentas y notificaciones | Las pantallas cargaron y la sesión se conservó durante las operaciones |
| Crear estudiante desde administrador | Enviar vacío; completar perfil; invertir horario 14:00–12:00; corregir a 08:00–12:00 | El vacío exigió nombre; horario invertido mostró un error concreto; perfil correcto produjo código y fila con carga 0/3 |
| Correo duplicado y persistencia | Recargar estudiantes e intentar otro perfil con el mismo correo | El perfil persistió; el duplicado mostró «El email ya está registrado» sin borrar el formulario; corregir el correo permitió crear Mateo |
| Cancelar edición | Cambiar nombre de Lucía y pulsar Cancelar; abrir su perfil | El nombre original se conservó |
| Registrar paciente y asignación manual | Crear CASO-000001; abrir contacto, resumen, precalificación e historial; asignar a Lucía con motivo | Paciente asignado y motivo/responsable/fecha visibles en historial |
| Matching con distinta carga | Con Lucía ocupada, registrar CASO-000002 de Operatoria y ejecutar matching | Se asignó a Mateo, que tenía menor carga visible; resultado 83 % |
| Seguimiento del origen | Iniciar sesión con Lucía; consultar teléfono/email; guardar Contactado y nota | La nota y el cambio de estado se añadieron al historial con autora y fecha |
| Propuesta de derivación | Proponer Endodoncia, prioridad Alta, tratamiento y motivo desde Lucía | Estado Derivación pendiente; propuesta visible; aviso de que el cupo de origen se conserva hasta revisión |
| Aprobación sin receptor disponible | Admin aprobó mientras el único horario compatible de Mateo seguía ocupado | Derivación Aprobada y Pendiente de receptor; mensaje controlado de falta de disponibilidad. No se produjo una asignación solapada |
| Recuperación al liberar capacidad | Mateo canceló la asignación de CASO-000002; admin reejecutó matching | CASO-000001 se asignó a Mateo por Endodoncia (88 %). CASO-000002 volvió a asignarse a Lucía, conforme a la cancelación de asignación definida en DMC-024 |
| Tratamiento completo e historial | Mateo guardó Contactado → En tratamiento → Completado, cada cambio con nota; recargar y abrir detalle | Completado persistió; se conservaron nueve eventos desde registro, origen, derivación, aprobación y receptor, con responsables y fechas |
| Cupo y cierre definitivo | Admin abrió perfil de Mateo y volvió a ejecutar matching antes del siguiente registro público | Mateo mostró 0/3 activos y 1 completado; matching procesó 0 y creó 0 asignaciones. El caso completado no reingresó |
| Restricciones de estudiante | Intentar abrir `/users` con Mateo | Redirección a Mis Asignaciones; navegación restringida al espacio del estudiante |
| Cuentas de personal y suspensión | Admin creó Personal Exploración como coordinador, suspendió la cuenta y se intentó iniciar sesión con ella | Cuenta Suspendida visible; inicio de sesión rechazado con «Credenciales inválidas» |
| Coordinador | Iniciar sesión, intentar `/users`, abrir estudiantes y crear Sofía | No apareció Cuentas y roles; `/users` redirigió al Dashboard; Sofía se creó con código y se conservó la sesión del coordinador |
| Notificación sin proveedor | Pulsar Enviar en un aviso pendiente | Mensaje «Configura RESEND_API_KEY y EMAIL_FROM para enviar correos»; permaneció Pendiente. No se comprobó entrega real |
| Paciente público y fallback | Cuestionario con datos sintéticos y seis respuestas; enviar sin consentimiento y después con consentimiento | Sin consentimiento se bloqueó y enfocó la casilla. Con consentimiento terminó Registro exitoso, CASO-000003, estudiante Mateo y cita propuesta pese a IA desconectada |
| Registro público y móvil | Landing → Soy estudiante; crear Diego en 390 × 844; iniciar sesión; abrir menú móvil y cerrar sesión | Confirmación con código, inicio de sesión correcto, Sin asignaciones visible y menú móvil operable. Las vistas inspeccionadas no presentaron cortes que impidieran usar los controles |
| Corrección de marca | Se detectó Dental Matching en landing y formulario de pacientes; tras corrección y nuevo build se navegaron otra vez ambas pantallas | Dental Match quedó visible en cabecera, etiqueta del enlace y pie. Corrección comprobada desde el navegador |

## Hallazgos y límites

No se encontró un fallo funcional que impidiera completar los recorridos anteriores. Hubo un hallazgo de presentación: el nombre anterior **Dental Matching** en pantallas públicas. Se corrigió durante la exploración y se volvió a comprobar en el navegador.

La revisión final del agente principal también corrigió a **Dental Match** el título HTML inicial de `client/index.html` y confirmó el nuevo build. La marca visible y los títulos de ruta ya se habían comprobado desde la interfaz. La comprobación adicional de ese último build por navegador quedó limitada: al retomar la herramienta ya no estaba disponible la sesión del navegador integrado y el intento único de abrir el formulario local en Brave devolvió `net::ERR_CONNECTION_REFUSED`. Por tanto, la corrección del título HTML inicial se respalda aquí en la revisión del código/build del agente principal, no en una nueva recarga exitosa de la interfaz.

Se observaron dos puntos de claridad para la interfaz:

1. **Cupo total y cupo del horario:** Mateo tenía máximo 3 casos, pero el único bloque registrado solo admite un paciente. Por ello no podía recibir la derivación con ese horario ocupado. Al liberarlo, el reintento funcionó. El formulario de registro no explica el cupo predeterminado de un paciente por horario.
2. **Cancelado significa cancelar la asignación:** el paciente sigue ingresado y vuelve a pendiente para otro matching. Esto coincide con DMC-024, según la revisión del código y backlog realizada por el agente principal. La etiqueta Estado del caso / Cancelado no explicita esa diferencia; retirar al paciente del matching corresponde a desactivarlo desde personal.

Las comprobaciones de permisos de este recorrido son las restricciones visibles de navegación e inicio de sesión, no una auditoría exhaustiva de autorización por API. La persistencia se comprobó mediante recarga y nuevas sesiones, no mediante consultas SQL en este recorrido.

Al terminar, la consulta de mensajes `error` y `warn` capturados por la pestaña (límite 100) devolvió una lista vacía. Esto describe la captura disponible del navegador y no garantiza que no existan errores fuera de este recorrido.

El registro público terminó con el fallback del entorno sin IA, pero aquí no se evaluó la calidad de un análisis real del proveedor. El envío de correo se limitó a la falta de configuración controlada. Tampoco se verificaron producción, dispositivos físicos, todos los tamaños de pantalla ni aceptación por un usuario humano. Estas condiciones permanecen separadas del resultado local.

## Evidencias

Capturas obtenidas del navegador durante el recorrido:

Las capturas del registro público anteriores al ajuste conservan el nombre antiguo como evidencia histórica; las dos capturas de marca corregida muestran el resultado posterior.

- [Matching del segundo paciente](evidencias/exploracion-local-20261005-matching.png)
- [Detalle del caso desde el estudiante](evidencias/exploracion-local-20261005-detalle-paciente.png)
- [Derivación pendiente](evidencias/exploracion-local-20261005-derivacion-pendiente.png)
- [Aprobación sin receptor disponible](evidencias/exploracion-local-20261005-sin-receptor.png)
- [Caso completado después de recargar](evidencias/exploracion-local-20261005-caso-completado.png)
- [Mensaje de correo sin proveedor](evidencias/exploracion-local-20261005-correo-sin-proveedor.png)
- [Validación de consentimiento](evidencias/exploracion-local-20261005-validacion-consentimiento.png)
- [Confirmación del registro público de paciente](evidencias/exploracion-local-20261005-registro-paciente.png)
- [Confirmación de estudiante en móvil](evidencias/exploracion-local-20261005-registro-estudiante-movil.png)
- [Marca corregida en landing móvil](evidencias/exploracion-local-20261005-marca-corregida-movil.png)
- [Marca corregida en registro de pacientes móvil](evidencias/exploracion-local-20261005-paciente-marca-corregida-movil.png)

El reporte [Pruebas y CI](PRUEBAS_Y_CI.md) reúne las suites y controles automatizados que complementan esta exploración.
