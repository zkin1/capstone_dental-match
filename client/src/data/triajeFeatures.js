// Mirror intencional de ai_agent/prompts.py (CATEGORIES + REQUIRED_FEATURES).
// Python y JS no comparten runtime: si prompts.py cambia, actualizar aquí.
// ui: 'radio' (2-3 valores), 'select' (muchos), 'slider' (intensidad 1-10).
// na: valor por defecto cuando la pregunta no aplica / no se respondió.

export const TRIAJE_SECTIONS = [
  { id: 'dolor', titulo: 'Sobre el dolor', icono: 'activity' },
  { id: 'diente', titulo: 'Sobre el diente', icono: 'tooth' },
  { id: 'encias', titulo: 'Sobre las encías', icono: 'shield' },
];

export const TRIAJE_FEATURES = [
  // --- Dolor ---
  { key: 'tipo_dolor', seccion: 'dolor', label: '¿Cómo es el dolor?', ui: 'radio', na: '',
    options: ['Sin dolor', 'Provocado', 'Espontaneo'],
    labels: { 'Provocado': 'Provocado (al comer/tomar)', 'Espontaneo': 'Espontáneo (aparece solo)' } },
  { key: 'duracion_dolor', seccion: 'dolor', label: 'Cuando duele, ¿cuánto dura?', ui: 'radio', na: 'N/A',
    ocultarSiSinDolor: true,
    options: ['N/A', 'Pasa inmediato', 'Persistente', 'Constante'] },
  { key: 'tiempo_evolucion_dolor', seccion: 'dolor', label: '¿Hace cuánto empezó el dolor?', ui: 'radio', na: 'N/A',
    ocultarSiSinDolor: true,
    options: ['N/A', 'Menos de 2 dias', 'Una semana', 'Mas de una semana'],
    labels: { 'Menos de 2 dias': 'Menos de 2 días', 'Mas de una semana': 'Más de una semana' } },
  { key: 'dolor_nocturno', seccion: 'dolor', label: '¿Le despierta por la noche?', ui: 'radio', na: 'No',
    ocultarSiSinDolor: true,
    options: ['Si', 'No'], labels: { 'Si': 'Sí' } },
  { key: 'dolor_pulsante', seccion: 'dolor', label: '¿Es un dolor pulsátil (late como el corazón)?', ui: 'radio', na: 'N/A',
    ocultarSiSinDolor: true,
    options: ['N/A', 'Si', 'No'], labels: { 'Si': 'Sí' } },
  { key: 'dolor_irradiado', seccion: 'dolor', label: '¿El dolor se extiende hacia otra zona?', ui: 'select', na: 'N/A',
    ocultarSiSinDolor: true,
    options: ['N/A', 'No se irradia', 'Oido', 'Cabeza', 'Cuello', 'Mandibula', 'Varios lugares'],
    labels: { 'Oido': 'Oído', 'Mandibula': 'Mandíbula' } },
  { key: 'dolor_al_morder', seccion: 'dolor', label: '¿Le duele al morder?', ui: 'radio', na: 'No',
    ocultarSiSinDolor: true,
    options: ['Si', 'No'], labels: { 'Si': 'Sí' } },
  { key: 'intensidad_dolor', seccion: 'dolor', label: 'Intensidad del dolor', ui: 'slider', na: 1,
    ocultarSiSinDolor: true },
  { key: 'sensibilidad', seccion: 'dolor', label: '¿Sensibilidad al frío o calor?', ui: 'radio', na: 'Ninguno',
    options: ['Ninguno', 'Solo frio', 'Frio y Calor'],
    labels: { 'Solo frio': 'Solo al frío', 'Frio y Calor': 'Frío y calor' } },
  { key: 'medicamento_dolor', seccion: 'dolor', label: '¿Ha tomado algún medicamento?', ui: 'radio', na: 'Ninguno',
    options: ['Ninguno', 'Analgesico comun', 'Antibiotico previo', 'Otro'],
    labels: { 'Analgesico comun': 'Analgésico común', 'Antibiotico previo': 'Antibiótico previo' } },
  { key: 'alivio_medicamento', seccion: 'dolor', label: '¿El medicamento le alivia?', ui: 'radio', na: 'N/A',
    ocultarSiSinDolor: true, ocultarSiSinMedicamento: true,
    options: ['N/A', 'Si', 'Parcialmente', 'No'], labels: { 'Si': 'Sí' } },

  // --- Diente ---
  { key: 'hallazgo_visual', seccion: 'diente', label: '¿Qué nota en su diente o encía?', ui: 'select', na: 'Ninguno',
    options: ['Encias rojas o Sangrado', 'Mancha u Hoyo', 'Ninguno', 'Diente flojo', 'Diente roto o Fractura', 'Hinchazon'],
    labels: { 'Encias rojas o Sangrado': 'Encías rojas o sangrado', 'Mancha u Hoyo': 'Mancha o hueco', 'Hinchazon': 'Hinchazón' } },
  { key: 'profundidad_lesion', seccion: 'diente', label: 'Si tiene una lesión, ¿qué tan profunda parece?', ui: 'select', na: 'N/A',
    options: ['N/A', 'No visible pero con molestia', 'Superficial (esmalte)', 'Moderada (dentina)', 'Profunda (cerca de pulpa)', 'Compromete raiz'],
    labels: { 'Compromete raiz': 'Compromete raíz' } },
  { key: 'movilidad_dental', seccion: 'diente', label: '¿Siente algún diente flojo?', ui: 'radio', na: 'Ninguna',
    options: ['Ninguna', 'Grado I o II (a evaluar)', 'Grado III (severa)'],
    labels: { 'Grado I o II (a evaluar)': 'Un poco flojo', 'Grado III (severa)': 'Muy flojo' } },
  { key: 'signos_infeccion', seccion: 'diente', label: '¿Signos de infección (pus, hinchazón, fiebre)?', ui: 'radio', na: 'Ninguno',
    options: ['Ninguno', 'Fistula', 'Absceso/Hinchazon con fiebre'],
    labels: { 'Fistula': 'Fístula (punto de pus)', 'Absceso/Hinchazon con fiebre': 'Absceso / hinchazón con fiebre' } },
  { key: 'tiempo_fistula', seccion: 'diente', label: '¿Hace cuánto apareció la fístula?', ui: 'radio', na: 'N/A',
    ocultarSiSinFistula: true,
    options: ['N/A', 'Reciente', 'Antigua'] },
  { key: 'tratamiento_previo', seccion: 'diente', label: '¿Ese diente ha tenido tratamiento previo?', ui: 'radio', na: 'Ninguno',
    options: ['Ninguno', 'Restauracion previa', 'Endodoncia previa fallida'],
    labels: { 'Restauracion previa': 'Restauración (empaste) previa' } },

  // --- Encías ---
  { key: 'estado_periodontal', seccion: 'encias', label: '¿Cómo ve sus encías?', ui: 'select', na: 'Sano',
    options: ['Sano', 'Gingivitis (reversible)', 'Periodontitis leve', 'Periodontitis avanzada'],
    labels: { 'Sano': 'Sanas', 'Gingivitis (reversible)': 'Inflamadas / sangran (gingivitis)', 'Periodontitis leve': 'Se retraen un poco', 'Periodontitis avanzada': 'Se retraen mucho / dientes flojos' } },
  { key: 'sangrado_encias', seccion: 'encias', label: '¿Le sangran las encías?', ui: 'radio', na: 'No sangran',
    options: ['No sangran', 'Solo al cepillarme', 'Espontaneo'],
    labels: { 'Espontaneo': 'Sangran solas' } },
  { key: 'tiempo_sintomas_gingivales', seccion: 'encias', label: '¿Hace cuánto nota los problemas de encías?', ui: 'select', na: 'N/A',
    options: ['N/A', 'Menos de 2 semanas', 'Semanas a meses', 'Mas de 6 meses'],
    labels: { 'Mas de 6 meses': 'Más de 6 meses' } },
  { key: 'mal_aliento', seccion: 'encias', label: '¿Nota mal aliento?', ui: 'radio', na: 'No',
    options: ['Si', 'No'], labels: { 'Si': 'Sí' } },
  { key: 'recesion_encia', seccion: 'encias', label: '¿Nota que las encías se retraen?', ui: 'radio', na: 'No',
    options: ['Si', 'No'], labels: { 'Si': 'Sí' } },
  { key: 'historial_bolsas', seccion: 'encias', label: '¿Le han dicho que tiene "bolsas" periodontales?', ui: 'radio', na: 'No, nunca',
    options: ['Si, me lo han dicho', 'No, nunca', 'No lo se'],
    labels: { 'Si, me lo han dicho': 'Sí, me lo han dicho' } },
];

export const REQUIRED_FEATURES = TRIAJE_FEATURES.map(f => f.key);

// Valores iniciales del formulario: cada feature parte en su valor N/A/seguro
export function buildRespuestasIniciales() {
  const out = {};
  for (const f of TRIAJE_FEATURES) out[f.key] = f.na;
  return out;
}

// Features que no aplican cuando el paciente no tiene dolor
export const OCULTAS_SIN_DOLOR = TRIAJE_FEATURES.filter(f => f.ocultarSiSinDolor).map(f => f.key);
