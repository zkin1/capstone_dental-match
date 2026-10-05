const {
  selectCandidate,
  scorePatientCategory,
} = require('../../src/application/matching/matching.service');
const {
  validateQualification,
  canRefer,
} = require('../../src/domain/assignments/referral.policy');
const {
  decideUpdate,
} = require('../../src/domain/assignments/assignment.policy');
const {
  CaseService,
} = require('../../src/application/assignments/case.service');
const PatientService = require('../../src/application/patients/patient.service');
const {
  preCategorizar,
} = require('../../src/adapters/outbound/ai/triage-agent.adapter');

const patient = {
  id: 1,
  edad: 30,
  ciudad: 'Metropolitana',
  derivacion_id: 1,
  dias_disponibles: ['lunes'],
  horario_preferencia: 'mañana',
};
const qualification = {
  specialty: 'Endodoncia',
  priority: 'Alta',
  treatment: 'Evaluación de endodoncia',
  reason: 'Dolor persistente luego de la revisión',
  validated: true,
};
const candidate = (id, load, credits = 0) => ({
  id_estudiante: id,
  id_especialidad_estudiante: id,
  especialidad: 'Endodoncia',
  ciudad: 'Metropolitana',
  dia_semana: 'lunes',
  hora_inicio: '08:00',
  casos_activos: load,
  casos_necesarios: 10,
  derivaciones_aprobadas: credits,
});
test('el reparto prioriza carga antes que el premio por derivar', () => {
  expect(
    selectCandidate(
      patient,
      [candidate(1, 3, 50), candidate(2, 1)],
      qualification
    ).id_estudiante
  ).toBe(2);
});
test('a igual carga se premian derivaciones aprobadas y se guarda la explicación', () => {
  const selected = selectCandidate(
    patient,
    [candidate(1, 1), candidate(2, 1, 3)],
    qualification
  );
  expect(selected.id_estudiante).toBe(2);
  expect(selected.factors).toMatchObject({
    politica: 'menor_carga_y_derivaciones_aprobadas',
    pacientes_activos: 1,
    derivaciones_aprobadas: 3,
  });
});
test.each([
  { especialidad: 'Periodoncia' },
  { ciudad: 'Valparaíso' },
  { dia_semana: 'martes' },
  { hora_inicio: '15:00' },
  { casos_activos: 10 },
])('el premio no omite restricciones: %j', (incompatible) => {
  expect(
    selectCandidate(
      patient,
      [{ ...candidate(1, 0, 100), ...incompatible }, candidate(2, 2)],
      qualification
    ).id_estudiante
  ).toBe(2);
});
test('el desempate final es estable y la clasificación validada prevalece', () => {
  expect(
    selectCandidate(patient, [candidate(2, 1), candidate(1, 1)], qualification)
      .id_estudiante
  ).toBe(1);
  expect(
    scorePatientCategory({
      ...patient,
      precalificacion_validada: qualification,
      respuestas_cuestionario: { hallazgo_visual: 'Mancha u Hoyo' },
    })
  ).toMatchObject(qualification);
});
test('la solicitud requiere revisión previa, propiedad y campos concretos', () => {
  expect(validateQualification(qualification)).toMatchObject({
    treatment: qualification.treatment,
  });
  expect(() =>
    validateQualification({ ...qualification, reason: '' })
  ).toThrow();
  expect(() =>
    validateQualification({ ...qualification, specialty: 'inventada' })
  ).toThrow();
  expect(() => canRefer({ estado: 'asignado' }, { role: 'admin' })).toThrow(
    'Primero contacta'
  );
  expect(() =>
    canRefer(
      { estado: 'contactado', codigo_estudiante: 'A' },
      { role: 'student', codigo_estudiante: 'B' }
    )
  ).toThrow('Solo puedes');
  expect(() =>
    canRefer({ estado: 'en_tratamiento' }, { role: 'admin' })
  ).not.toThrow();
});
test('la aprobación no se obtiene por una actualización genérica de estado', () => {
  expect(
    decideUpdate(
      { estado: 'contactado' },
      { estado: 'derivado' },
      { role: 'admin' }
    ).code
  ).toBe('CONFLICT');
  expect(
    decideUpdate(
      { estado: 'derivacion_pendiente' },
      { estado: 'completado' },
      { role: 'admin' }
    ).code
  ).toBe('CONFLICT');
  expect(
    decideUpdate(
      { estado: 'derivacion_pendiente' },
      { observaciones_estudiante: 'Nueva nota' },
      { role: 'admin' }
    ).ok
  ).toBe(true);
});
test('una derivación aprobada sin receptor se conserva pendiente para matching', async () => {
  const repository = {
    review: jest.fn().mockResolvedValue({ id_paciente: 1, estado: 'aprobada' }),
  };
  const matching = {
    matchPatient: jest.fn().mockRejectedValue(new Error('DB temporal')),
  };
  const service = new CaseService(repository, matching);
  const result = await service.review(
    1,
    {
      ...qualification,
      estado: 'aprobada',
      motivo_revision: 'Caso revisado y aprobado',
    },
    {}
  );
  expect(result.matching.success).toBe(false);
  await expect(
    service.review(1, { ...qualification, estado: 'invalid' }, {})
  ).rejects.toThrow();
});
test('un AbortError real del temporizador devuelve fallback', async () => {
  const originalFetch = global.fetch;
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = jest.fn(
    (url, { signal }) =>
      new Promise((resolve, reject) =>
        signal.addEventListener('abort', () => {
          const error = new Error('timeout');
          error.name = 'AbortError';
          reject(error);
        })
      )
  );
  try {
    const result = preCategorizar({ intensidad_dolor: 7 });
    await jest.advanceTimersByTimeAsync(50000);
    await expect(result).resolves.toBeNull();
  } finally {
    global.fetch = originalFetch;
    jest.useRealTimers();
  }
});
test('el registro continúa aunque el puerto de IA lance un error', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const repository = { createFromIntake: jest.fn().mockResolvedValue(1) };
  const service = new PatientService({
    repository,
    triage: {
      preCategorizar: jest.fn().mockRejectedValue(new Error('timeout')),
    },
    matching: {
      matchPatient: jest.fn().mockResolvedValue({ success: false }),
      scorePatientCategory,
    },
  });
  const result = await service.intake({
    nombre_completo: 'Paciente Demo',
    edad: 30,
    telefono: '912345678',
    ciudad: 'Metropolitana',
    consentimiento_datos: true,
    respuestas: { intensidad_dolor: 7 },
  });
  expect(result.data.id).toBe(1);
  expect(repository.createFromIntake.mock.calls[0][2]).toEqual({
    intensidad_dolor: 7,
  });
});
