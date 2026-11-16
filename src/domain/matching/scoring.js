const {
  normalizePriority,
  normalizeSpecialty,
  parseJson,
} = require('../common');

const INFECTION_ALERT = 'Absceso/Hinchazon con fiebre';
const REVIEW_REQUIRED_REASON = 'El caso requiere revisión de coordinación por una alerta clínica';
const DISCREPANCY_REASON = 'El cuestionario y el agente discrepan; el caso requiere revisión clínica';

function hasInfectionAlert(answers) {
  const value = answers?.signos_infeccion;
  return typeof value === 'string' &&
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim() === INFECTION_ALERT.toLowerCase();
}

const WEIGHTS = Object.freeze({
  horario: 0.3,
  especialidad: 0.25,
  carga: 0.2,
  prioridad: 0.15,
  dolor: 0.05,
  experiencia: 0.05,
});

const CLINICS = Object.freeze({
  child: 'Clínica para el Niño y Adolescente',
  adult: 'Clínica Integral Adulto y Gerontología',
});

function classify(patient, answers) {
  const pain = Math.max(
    0,
    Math.min(10, Number(answers.intensidad_dolor ?? patient.nivel_dolor) || 0)
  );
  const isChild = Number(patient.edad) < 18;

  let specialty = normalizeSpecialty(patient.tipo_tratamiento_inferido);
  let priority = normalizePriority(patient.prioridad);
  let reason = 'Evaluación general';
  const redFlag = hasInfectionAlert(answers);

  if (redFlag) {
    specialty = 'Endodoncia';
    priority = 'Muy Alta';
    reason = 'Signos de infección con fiebre';
  } else if (
    answers.estado_periodontal === 'Periodontitis avanzada' ||
    answers.movilidad_dental === 'Grado III (severa)' ||
    answers.historial_bolsas === 'Si, me lo han dicho'
  ) {
    specialty = 'Periodoncia';
    priority = pain >= 7 ? 'Alta' : 'Moderada';
    reason = 'Hallazgos periodontales';
  } else if (
    answers.tratamiento_previo === 'Endodoncia previa fallida' ||
    answers.tipo_dolor === 'Espontaneo' ||
    ['Persistente', 'Constante'].includes(answers.duracion_dolor) ||
    answers.dolor_nocturno === 'Si'
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

  return { specialty, priority, pain, redFlag, reason, treatment: `Evaluación de ${specialty}` };
}

function scorePatientCategory(patient) {
  const original = parseJson(patient.respuestas_cuestionario) ||
    parseJson(patient.sintomas_seleccionados) || {};
  const normalized = parseJson(patient.pre_categorizacion_ia);
  const originalCategory = classify(patient, original);
  const suggested = normalized ? classify(patient, normalized) : originalCategory;
  // Compare without the inferred values that a previous matching run may have updated.
  const baseline = { ...patient, tipo_tratamiento_inferido: null, prioridad: 'Moderada',
    nivel_dolor: original.intensidad_dolor ?? 0 };
  const originalEvidence = normalized && classify(baseline, original);
  const normalizedEvidence = normalized && classify(baseline, normalized);
  const discrepancy = normalizedEvidence && (
    originalEvidence.specialty !== normalizedEvidence.specialty ||
    originalEvidence.priority !== normalizedEvidence.priority
  );
  const category = originalCategory.redFlag ? originalCategory : suggested;
  const reviewReason = category.redFlag ? REVIEW_REQUIRED_REASON : discrepancy ? DISCREPANCY_REASON : null;
  const validated = parseJson(patient.precalificacion_validada);
  if (validated && normalizeSpecialty(validated.specialty)) {
    return {
      specialty: validated.specialty,
      priority: normalizePriority(validated.priority),
      pain: category.pain,
      redFlag: category.redFlag,
      reviewReason,
      reason: validated.reason,
      treatment: validated.treatment,
      validated: true,
    };
  }
  return { ...category, reviewReason };
}

function scheduleCompatibility(patient, candidate) {
  const days = parseJson(
    patient.dias_disponibles,
    patient.dias_disponibles || []
  );
  const normalizedDays = Array.isArray(days)
    ? days.map((day) => String(day).toLowerCase())
    : [];
  if (normalizedDays.length && !normalizedDays.includes(candidate.dia_semana))
    return 0;

  const preference = String(patient.horario_preferencia || '').toLowerCase();
  if (!preference) return 1;
  const hour = Number(String(candidate.hora_inicio).slice(0, 2));
  if (preference.includes('mañana') || preference.includes('manana'))
    return hour < 13 ? 1 : 0.35;
  if (preference.includes('tarde')) return hour >= 13 ? 1 : 0.35;
  return 1;
}

function calculateScore(
  patient,
  candidate,
  category,
  scheduleScore = scheduleCompatibility(patient, candidate)
) {
  const active = Number(candidate.casos_activos) || 0;
  const needed = Math.max(1, Number(candidate.casos_necesarios) || 1);
  const completed = Number(candidate.casos_completados) || 0;
  const priorityScore =
    { Baja: 0.25, Moderada: 0.5, Alta: 0.75, 'Muy Alta': 1 }[
      category.priority
    ] || 0.5;
  const factors = {
    horario: scheduleScore,
    especialidad: candidate.especialidad === category.specialty ? 1 : 0,
    carga: Math.max(0, 1 - active / needed),
    prioridad: priorityScore,
    dolor: Math.max(0, Math.min(1, category.pain / 10)),
    experiencia: Math.min(
      1,
      completed / 20 + (candidate.año_carrera === '5to' ? 0.25 : 0)
    ),
  };
  const score = Object.entries(WEIGHTS).reduce(
    (total, [key, weight]) => total + factors[key] * weight,
    0
  );
  return { score: Math.round(score * 10000) / 10000, factors };
}

function nextDateFor(day, weeksLater = 0) {
  const weekdays = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
  ];
  const target = weekdays.indexOf(day);
  if (target < 0) throw new Error(`Día de atención inválido: ${day}`);
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Santiago', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date());
  const { year, month, day: localDay } = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
  const date = new Date(Date.UTC(year, month - 1, localDay));
  const delta = (target - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + delta + weeksLater * 7);
  return date.toISOString().slice(0, 10);
}

module.exports = {
  INFECTION_ALERT,
  REVIEW_REQUIRED_REASON,
  WEIGHTS,
  CLINICS,
  scorePatientCategory,
  scheduleCompatibility,
  calculateScore,
  nextDateFor,
};
