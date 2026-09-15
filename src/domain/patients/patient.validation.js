const { CITIES, normalizePriority, normalizeSpecialty } = require('../common');

function validateBasePatient(input) {
  const age = Number(input.edad);
  if (!input.nombre_completo?.trim() || !input.telefono?.trim() || !CITIES.includes(input.ciudad)) {
    return { error: 'Nombre, teléfono y una ciudad válida son obligatorios' };
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { error: 'La edad debe estar entre 1 y 120 años' };
  }
  if (input.email && !/^\S+@\S+\.\S+$/.test(input.email)) {
    return { error: 'El email no es válido' };
  }
  return {
    value: {
      nombre_completo: input.nombre_completo.trim(),
      edad: age,
      telefono: input.telefono.trim(),
      email: input.email?.trim().toLowerCase() || null,
      ciudad: input.ciudad,
    },
  };
}

function validateIntake(input) {
  const base = validateBasePatient(input);
  if (base.error) return base;
  if (input.consentimiento_datos !== true) {
    return { error: 'Debes aceptar el uso de datos para gestionar el caso' };
  }
  if (!input.respuestas || typeof input.respuestas !== 'object'
    || Array.isArray(input.respuestas) || !Object.keys(input.respuestas).length) {
    return { error: 'El cuestionario clínico es obligatorio' };
  }
  return { value: base.value, answers: input.respuestas };
}

function validateCreate(input) {
  const base = validateBasePatient(input);
  if (base.error) return base;
  const specialty = normalizeSpecialty(input.tipo_tratamiento_inferido || input.tipo_tratamiento);
  if (!specialty) return { error: 'Selecciona una especialidad válida' };
  return {
    value: {
      ...base.value,
      specialty,
      description: input.descripcion_caso || '',
      pain: Math.max(0, Math.min(10, Number(input.nivel_dolor) || 0)),
      availableDays: input.dias_disponibles || null,
      preferredHours: input.horario_preferencia || null,
      priority: normalizePriority(input.prioridad || input.urgencia),
    },
  };
}

function validateUpdate(input) {
  const specialty = input.tipo_tratamiento_inferido
    ? normalizeSpecialty(input.tipo_tratamiento_inferido)
    : null;
  const fields = {
    nombre_completo: input.nombre_completo?.trim(),
    telefono: input.telefono?.trim(),
    email: input.email?.trim().toLowerCase() || null,
    edad: input.edad ? Number(input.edad) : undefined,
    ciudad: CITIES.includes(input.ciudad) ? input.ciudad : undefined,
    nivel_dolor: input.nivel_dolor == null
      ? undefined
      : Math.max(0, Math.min(10, Number(input.nivel_dolor))),
    tipo_tratamiento_inferido: specialty || undefined,
    prioridad: input.prioridad ? normalizePriority(input.prioridad) : undefined,
  };
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  return entries.length ? { value: Object.fromEntries(entries) } : { error: 'No hay cambios válidos' };
}

module.exports = { validateIntake, validateCreate, validateUpdate };
