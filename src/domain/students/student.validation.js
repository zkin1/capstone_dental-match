const { CITIES, SPECIALTIES, normalizeSpecialty } = require('../common');
const Joi = require('joi');

const DAYS = Object.freeze(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']);
const emailSchema = Joi.string().email().max(255).required();

function validateStudent(input, publicRegistration = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Los datos del estudiante no son válidos';
  const textLimits = { nombre_completo: 150, email: 255, telefono: 20, universidad: 150,
    ciudad: 30, año_carrera: 3, password: 72, confirmPassword: 72 };
  for (const [field, limit] of Object.entries(textLimits)) {
    if (input[field] !== undefined && (typeof input[field] !== 'string' || input[field].length > limit)) {
      return `El campo ${field} debe ser un texto de hasta ${limit} caracteres`;
    }
  }
  const required = ['nombre_completo', 'email', 'ciudad', 'año_carrera'];
  if (publicRegistration) required.push('password');
  if (required.some(field => !String(input[field] || '').trim())) {
    return 'Nombre, email, ciudad, año de carrera y contraseña son obligatorios';
  }
  if (emailSchema.validate(input.email).error) return 'El email no es válido';
  if (!['4to', '5to'].includes(input.año_carrera)) return 'El año de carrera debe ser 4to o 5to';
  if (!CITIES.includes(input.ciudad)) return 'La ciudad no es válida';
  if (publicRegistration && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(input.password)) {
    return 'La contraseña debe tener 8 caracteres, mayúscula, minúscula, número y símbolo';
  }
  if (publicRegistration && input.password !== input.confirmPassword) return 'Las contraseñas no coinciden';
  if (publicRegistration && new TextEncoder().encode(input.password).length > 72) return 'La contraseña es demasiado larga; usa una más corta';
  if (input.casos_necesarios !== undefined
    && (!Number.isInteger(Number(input.casos_necesarios)) || Number(input.casos_necesarios) < 1 || Number(input.casos_necesarios) > 50)) {
    return 'La carga máxima debe ser un entero entre 1 y 50';
  }
  if (!Array.isArray(input.especialidades) || !input.especialidades.length) return 'Selecciona al menos una especialidad';
  if (!Array.isArray(input.horarios_disponibles) || !input.horarios_disponibles.length) {
    return 'Selecciona al menos un horario de atención';
  }
  const seenSchedules = new Set();
  for (const slot of input.horarios_disponibles) {
    if (!slot || !DAYS.includes(slot.dia)
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.hora_inicio || '')
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.hora_fin || '')
      || slot.hora_inicio >= slot.hora_fin) {
      return 'Cada horario debe tener un día válido y una hora de inicio anterior al término';
    }
    const key = `${slot.dia}|${slot.hora_inicio}|${slot.hora_fin}`;
    if (seenSchedules.has(key)) return 'No repitas el mismo horario de atención';
    seenSchedules.add(key);
    if (slot.capacidad_pacientes !== undefined
      && (!Number.isInteger(Number(slot.capacidad_pacientes)) || Number(slot.capacidad_pacientes) < 1 || Number(slot.capacidad_pacientes) > 50)) {
      return 'La capacidad del horario debe ser un entero entre 1 y 50';
    }
  }
  return null;
}

function normalizeSpecialties(values) {
  const specialties = [...new Set(values.map(normalizeSpecialty).filter(Boolean))];
  return specialties.length === values.length && specialties.every(value => SPECIALTIES.includes(value))
    ? specialties
    : null;
}

function validateStaffUpdate(input) {
  const allowed = ['nombre_completo', 'año_carrera', 'telefono', 'email', 'universidad', 'ciudad', 'casos_necesarios', 'estado'];
  const entries = allowed.filter(field => input[field] !== undefined);
  if (!entries.length) return { error: 'No hay campos permitidos para actualizar' };
  if (input.año_carrera && !['4to', '5to'].includes(input.año_carrera)) {
    return { error: 'El año de carrera no es válido' };
  }
  if (input.ciudad && !CITIES.includes(input.ciudad)) return { error: 'La ciudad no es válida' };
  if (input.estado && !['activo', 'inactivo'].includes(input.estado)) return { error: 'El estado no es válido' };
  if (input.email !== undefined && emailSchema.validate(input.email).error) return { error: 'El email no es válido' };

  const changes = Object.fromEntries(entries.map(field => {
    if (field === 'email') return [field, input[field].toLowerCase()];
    if (field === 'casos_necesarios') return [field, Math.max(1, Math.min(50, Number(input[field])))];
    return [field, input[field] || null];
  }));
  return { value: changes };
}

module.exports = { DAYS, validateStudent, normalizeSpecialties, validateStaffUpdate };
