# Dental Matching — dirección visual V2

## Referencia

La dirección sigue la guía de OpenAI sobre frontends agradables: una composición protagonista, fotografía con función narrativa, titulares expresivos, contenido real, menos contenedores repetidos y una interacción visual contenida. La referencia de trabajo es [Designing delightful frontends with GPT-5.4](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4).

## Dirección

**Clínica editorial de encuentros.** Dental Matching debe sentirse humano antes que técnico. La interfaz explica el siguiente paso con calma, usa la fotografía para situar a las personas y reserva el lenguaje de producto para cuando ayuda a decidir.

## Sistema visual

- Fondo: marfil cálido `#F3F0E9`.
- Tinta: azul noche `#102A43` para titulares, navegación y lectura.
- Acción: azul cobalto `#2855D9`.
- Señal de confianza: menta `#B8E4DA`.
- Atención: coral `#F07C64`, usado con moderación para marcadores y bordes de acción.
- Superficies: blanco cálido, líneas finas y sombras discretas; no glassmorphism ni gradientes decorativos.
- Display: Space Grotesk, peso 600–700, tracking ligeramente negativo.
- Body: DM Sans, peso 400–600, medida cómoda y lenguaje directo.

## Composición por superficie

- **Landing:** hero full-bleed con una única tesis, fotografía editorial, dos acciones claras y navegación mínima.
- **Historia:** una sección de introducción con fotografía de detalle, seguida por un recorrido de tres pasos en filas; se evita el grid de tarjetas SaaS.
- **Roles:** dos paneles de color suave, uno para pacientes y otro para estudiantes, con una acción por panel.
- **Login:** contexto editorial oscuro a la izquierda y formulario limpio a la derecha.
- **Registro:** columna de orientación a la izquierda y un lienzo de formulario único a la derecha; en móvil se convierte en una sola lectura vertical.
- **App autenticada:** mantiene la tinta azul noche, la jerarquía tipográfica, estados sobrios y tablas respirables.

## Fotografía y activos

La landing usa dos imágenes editoriales originales generadas para este producto en `client/public/images/`: una escena de conversación clínica para el hero y un detalle de revisión de caso para la narrativa. No se depende de imágenes remotas ni de fotografías con marcas de terceros.

## Interacción

- La primera vista debe responder en segundos qué conecta Dental Matching, para quién es y cuál es el próximo paso.
- Los formularios conservan progreso visible, foco accesible, estados de error y loading.
- Las animaciones se limitan a entrada suave de hero/copy y microinteracciones de acción; todo respeta `prefers-reduced-motion`.
- Los chips conservan inputs reales accesibles, pero no pueden alterar el layout ni provocar overflow.

## Contrato de consistencia

- Una sola acción primaria por bloque.
- No añadir tarjetas, pills o métricas decorativas si no reducen incertidumbre.
- Copy humano, específico y sin promesas clínicas exageradas.
- Todo nuevo flujo debe validarse en escritorio y en móvil antes de considerarse terminado.
