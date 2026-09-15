const {
  normalizePriority,
  normalizeSpecialty,
  parseJson,
} = require('../common');

const WEIGHTS = Object.freeze({
  horario: 0.30,
  especialidad: 0.25,
  carga: 0.20,
  prioridad: 0.15,
  dolor: 0.05,
  experiencia: 0.05,
});

const CLINICS = Object.freeze({
  child: 'Clínica para el Niño y Adolescente',
  adult: 'Clínica Integral Adulto y Gerontología',
});

function scorePatientCategory(patient) {
  const answers = parseJson(patient.pre_categorizacion_ia, null)
    || parseJson(patient.respuestas_cuestionario, null)
    || parseJson(patient.sintomas_seleccionados, {});
  const pain = Math.max(0, Math.min(10, Number(answers.intensidad_dolor ?? patient.nivel_dolor) || 0));
  const isChild = Number(patient.edad) < 18;

  let specialty = normalizeSpecialty(patient.tipo_tratamiento_inferido);
  let priority = normalizePriority(patient.prioridad);
  let reason = 'Evaluación general';
  let redFlag = false;

  if (answers.signos_infeccion === 'Absceso/Hinchazon con fiebre') {
    specialty = 'Endodoncia';
    priority = 'Muy Alta';
    reason = 'Signos de infección con fiebre';
    redFlag = true;
  } else if (
    answers.estado_periodontal === 'Periodontitis avanzada'
    || answers.movilidad_dental === 'Grado III (severa)'
    || answers.historial_bolsas === 'Si, me lo han dicho'
  ) {
    specialty = 'Periodoncia';
    priority = pain >= 7 ? 'Alta' : 'Moderada';
    reason = 'Hallazgos periodontales';
  } else if (
    answers.tratamiento_previo === 'Endodoncia previa fallida'
    || answers.tipo_dolor === 'Espontaneo'
    || ['Persistente', 'Constante'].includes(answers.duracion_dolor)
    || answers.dolor_nocturno === 'Si'
  ) {
    specialty = 'Endodoncia';
    priority = pain >= 8 ? 'Muy Alta' : 'Alta';
    reason = 'Patrón compatible con compromiso pulpar';
  } else if (answers.hallazgo_visual === 'Diente roto o Fractura') {
    specialty = 'Prótesis Fija';
    priority = pain >= 7 ? 'Alta' : 'Moderada';
    reason = 'Diente fracturado';
  } else if (answers.hallazgo_visual === 'Mancha u Hoyo') {
    specialty = 'Operatoria Dental';
    priority = pain >= 7 ? 'Alta' : 'Moderada';
    reason = 'Lesión dentaria visible';
  }

  if (!specialty) specialty = 'Operatoria Dental';
  if (isChild) specialty = 'Odontopediatría';

  return { specialty, priority, pain, redFlag, reason };
}

function scheduleCompatibility(patient, candidate) {
  const days = parseJson(patient.dias_disponibles, patient.dias_disponibles || []);
  const normalizedDays = Array.isArray(days) ? days.map(day => String(day).toLowerCase()) : [];
  if (normalizedDays.length && !normalizedDays.includes(candidate.dia_semana)) return 0;

  const preference = String(patient.horario_preferencia || '').toLowerCase();
  if (!preference) return 1;
  const hour = Number(String(candidate.hora_inicio).slice(0, 2));
  if (preference.includes('mañana') || preference.includes('manana')) return hour < 13 ? 1 : 0.35;
  if (preference.includes('tarde')) return hour >= 13 ? 1 : 0.35;
  return 1;
}

function calculateScore(patient, candidate, category, scheduleScore = scheduleCompatibility(patient, candidate)) {
  const active = Number(candidate.casos_activos) || 0;
  const needed = Math.max(1, Number(candidate.casos_necesarios) || 1);
  const completed = Number(candidate.casos_completados) || 0;
  const priorityScore = { Baja: 0.25, Moderada: 0.5, Alta: 0.75, 'Muy Alta': 1 }[category.priority] || 0.5;
  const factors = {
    horario: scheduleScore,
    especialidad: candidate.especialidad === category.specialty ? 1 : 0,
    carga: Math.max(0, 1 - active / needed),
    prioridad: priorityScore,
    dolor: Math.max(0, Math.min(1, category.pain / 10)),
    experiencia: Math.min(1, completed / 20 + (candidate.año_carrera === '5to' ? 0.25 : 0)),
  };
  const score = Object.entries(WEIGHTS).reduce((total, [key, weight]) => total + factors[key] * weight, 0);
  return { score: Math.round(score * 10000) / 10000, factors };
}

function nextDateFor(day) {
  const weekdays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const target = weekdays.indexOf(day);
  if (target < 0) throw new Error(`Día de atención inválido: ${day}`);
  const date = new Date();
  let delta = (target - date.getDay() + 7) % 7;
  if (delta === 0) delta = 7;
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

module.exports = {
  WEIGHTS,
  CLINICS,
  scorePatientCategory,
  scheduleCompatibility,
  calculateScore,
  nextDateFor,
};
