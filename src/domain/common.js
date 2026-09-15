const SPECIALTIES = Object.freeze([
  'Endodoncia',
  'Operatoria Dental',
  'Ortodoncia',
  'Periodoncia',
  'Cirugía Oral',
  'Odontopediatría',
  'Prótesis Fija',
  'Prótesis Removible',
]);

const CITIES = Object.freeze(['Metropolitana', 'Valparaíso', 'Concepción']);
const PRIORITIES = Object.freeze(['Baja', 'Moderada', 'Alta', 'Muy Alta']);
const ASSIGNMENT_STATES = Object.freeze([
  'asignado', 'notificado', 'contactado', 'en_tratamiento', 'completado', 'cancelado',
]);
const ACTIVE_ASSIGNMENT_STATES = Object.freeze(
  ASSIGNMENT_STATES.filter(state => !['completado', 'cancelado'].includes(state)),
);

const TRANSITIONS = Object.freeze({
  asignado: ['notificado', 'contactado', 'cancelado'],
  notificado: ['contactado', 'cancelado'],
  contactado: ['en_tratamiento', 'cancelado'],
  en_tratamiento: ['completado', 'cancelado'],
  completado: [],
  cancelado: [],
});

const specialtyAliases = new Map([
  ['endodoncia', 'Endodoncia'],
  ['operatoria', 'Operatoria Dental'],
  ['operatoria dental', 'Operatoria Dental'],
  ['ortodoncia', 'Ortodoncia'],
  ['periodoncia', 'Periodoncia'],
  ['cirugia oral', 'Cirugía Oral'],
  ['cirugía oral', 'Cirugía Oral'],
  ['cirugia_oral', 'Cirugía Oral'],
  ['odontopediatria', 'Odontopediatría'],
  ['odontopediatría', 'Odontopediatría'],
  ['protesis', 'Prótesis Removible'],
  ['prótesis', 'Prótesis Removible'],
  ['protesis fija', 'Prótesis Fija'],
  ['prótesis fija', 'Prótesis Fija'],
  ['protesis removible', 'Prótesis Removible'],
  ['prótesis removible', 'Prótesis Removible'],
]);

const priorityAliases = new Map([
  ['baja', 'Baja'],
  ['media', 'Moderada'],
  ['moderada', 'Moderada'],
  ['alta', 'Alta'],
  ['urgente', 'Muy Alta'],
  ['muy alta', 'Muy Alta'],
]);

function normalizedKey(value) {
  return String(value || '').trim().toLocaleLowerCase('es');
}

function normalizeSpecialty(value) {
  return specialtyAliases.get(normalizedKey(value)) || null;
}

function normalizePriority(value) {
  return priorityAliases.get(normalizedKey(value)) || 'Moderada';
}

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  SPECIALTIES,
  CITIES,
  PRIORITIES,
  ASSIGNMENT_STATES,
  ACTIVE_ASSIGNMENT_STATES,
  TRANSITIONS,
  normalizeSpecialty,
  normalizePriority,
  parseJson,
};
