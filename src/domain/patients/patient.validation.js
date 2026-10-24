const { CITIES, normalizePriority, normalizeSpecialty } = require('../common');

const PHONE_REGEX = /^\+569\d{8}$/;

function validateBasePatient(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Los datos del paciente no son válidos' };
  }

  const nombre = typeof input.nombre_completo === 'string'
    ? input.nombre_completo.trim()
    : '';

  const telefono = typeof input.telefono === 'string'
    ? input.telefono.trim()
    : '';

  if (!nombre || !telefono || !CITIES.includes(input.ciudad)) {
    return {
      error: 'Nombre, teléfono y una ciudad válida son obligatorios',
    };
  }

  // Validar teléfono móvil chileno: +56 seguido de 9 dígitos,
  // donde el primer dígito después de +56 debe ser 9.
  if (!PHONE_REGEX.test(telefono)) {
    return {
      error: 'El teléfono debe tener el formato +56912345678',
    };
  }

  const age = Number(input.edad);

  if (
    input.edad === '' ||
    input.edad == null ||
    !Number.isInteger(age) ||
    age < 1 ||
    age > 120
  ) {
    return {
      error: 'La edad debe estar entre 1 y 120 años',
    };
  }

  let email = null;

  if (input.email != null && input.email !== '') {
    if (typeof input.email !== 'string') {
      return { error: 'El email no es válido' };
    }

    email = input.email.trim().toLowerCase();

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return { error: 'El email no es válido' };
    }
  }

  return {
    value: {
      nombre_completo: nombre,
      edad: age,
      telefono,
      email,
      ciudad: input.ciudad,
    },
  };
}

function validateIntake(input) {
  const base = validateBasePatient(input);

  if (base.error) return base;

  if (input.consentimiento_datos !== true) {
    return {
      error: 'Debes aceptar el uso de datos para gestionar el caso',
    };
  }

  if (
    !input.respuestas ||
    typeof input.respuestas !== 'object' ||
    Array.isArray(input.respuestas) ||
    !Object.keys(input.respuestas).length
  ) {
    return {
      error: 'El cuestionario clínico es obligatorio',
    };
  }

  return {
    value: base.value,
    answers: input.respuestas,
  };
}

function validateCreate(input) {
  const base = validateBasePatient(input);

  if (base.error) return base;

  const specialty = normalizeSpecialty(
    input.tipo_tratamiento_inferido || input.tipo_tratamiento
  );

  if (!specialty) {
    return {
      error: 'Selecciona una especialidad válida',
    };
  }

  return {
    value: {
      ...base.value,
      specialty,
      description: input.descripcion_caso || '',
      pain: Math.max(
        0,
        Math.min(10, Number(input.nivel_dolor) || 0)
      ),
      availableDays: input.dias_disponibles || null,
      preferredHours: input.horario_preferencia || null,
      priority: normalizePriority(
        input.prioridad || input.urgencia
      ),
    },
  };
}

function validateUpdate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      error: 'Los datos de actualización no son válidos',
    };
  }

  const fields = {};

  if (input.nombre_completo !== undefined) {
    if (typeof input.nombre_completo !== 'string') {
      return { error: 'El nombre no es válido' };
    }

    const nombre = input.nombre_completo.trim();

    if (!nombre) {
      return { error: 'El nombre no puede estar vacío' };
    }

    fields.nombre_completo = nombre;
  }

  if (input.telefono !== undefined) {
    if (typeof input.telefono !== 'string') {
      return { error: 'El teléfono no es válido' };
    }

    const telefono = input.telefono.trim();

    if (!PHONE_REGEX.test(telefono)) {
      return {
        error: 'El teléfono debe tener el formato +56912345678',
      };
    }

    fields.telefono = telefono;
  }

  if (input.email !== undefined) {
    if (input.email === null || input.email === '') {
      fields.email = null;
    } else if (typeof input.email === 'string') {
      const email = input.email.trim().toLowerCase();

      if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return { error: 'El email no es válido' };
      }

      fields.email = email;
    } else {
      return { error: 'El email no es válido' };
    }
  }

  if (input.edad !== undefined) {
    const edad = Number(input.edad);

    if (
      input.edad === '' ||
      input.edad === null ||
      !Number.isInteger(edad) ||
      edad < 1 ||
      edad > 120
    ) {
      return {
        error: 'La edad debe estar entre 1 y 120 años',
      };
    }

    fields.edad = edad;
  }

  if (input.ciudad !== undefined) {
    if (!CITIES.includes(input.ciudad)) {
      return { error: 'La ciudad no es válida' };
    }

    fields.ciudad = input.ciudad;
  }

  if (input.nivel_dolor !== undefined) {
    const pain = Number(input.nivel_dolor);

    if (
      input.nivel_dolor === null ||
      input.nivel_dolor === '' ||
      !Number.isInteger(pain) ||
      pain < 0 ||
      pain > 10
    ) {
      return {
        error: 'El nivel de dolor debe ser un entero entre 0 y 10',
      };
    }

    fields.nivel_dolor = pain;
  }

  if (input.tipo_tratamiento_inferido !== undefined) {
    const specialty = normalizeSpecialty(
      input.tipo_tratamiento_inferido
    );

    if (!specialty) {
      return { error: 'La especialidad no es válida' };
    }

    fields.tipo_tratamiento_inferido = specialty;
  }

  if (input.prioridad !== undefined) {
    const priority = normalizePriority(input.prioridad);

    if (!priority) {
      return { error: 'La prioridad no es válida' };
    }

    fields.prioridad = priority;
  }

  const entries = Object.entries(fields);

  return entries.length
    ? { value: Object.fromEntries(entries) }
    : { error: 'No hay cambios válidos' };
}

module.exports = {
  validateIntake,
  validateCreate,
  validateUpdate,
};
