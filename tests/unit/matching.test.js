jest.mock('../../src/infrastructure/database/connection', () => ({
  getConnection: jest.fn(),
  getPoolConnection: jest.fn(),
  transaction: jest.fn(),
}));

const {
  createMatchingService,
  WEIGHTS,
  calculateScore,
  scorePatientCategory,
  nextDateFor,
} = require('../../src/application/matching/matching.service');
const database = require('../../src/infrastructure/database/connection');
const MatchingRepository = require('../../src/adapters/outbound/persistence/postgres/matching.repository');
const matching = createMatchingService(new MatchingRepository(database));

const candidate = {
  especialidad: 'Endodoncia',
  año_carrera: '5to',
  casos_activos: 2,
  casos_necesarios: 10,
  casos_completados: 8,
  dia_semana: 'lunes',
  hora_inicio: '08:00',
};
const category = { specialty: 'Endodoncia', priority: 'Alta', pain: 7 };

describe('matching determinista ponderado', () => {
  test('los pesos suman exactamente 100%', () => {
    expect(Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 10);
  });

  test('devuelve el mismo score para la misma entrada y expone sus factores', () => {
    const first = calculateScore({}, candidate, category, 0.8);
    const second = calculateScore({}, candidate, category, 0.8);
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThan(0);
    expect(first.score).toBeLessThanOrEqual(1);
    expect(first.factors).toEqual(expect.objectContaining({ horario: 0.8, especialidad: 1 }));
  });

  test('un horario compatible y una carga menor aumentan la puntuación', () => {
    const available = calculateScore({}, { ...candidate, casos_activos: 0 }, category, 1).score;
    const busy = calculateScore({}, { ...candidate, casos_activos: 9 }, category, 0.2).score;
    expect(available).toBeGreaterThan(busy);
  });

  test('la IA solo aporta datos previos y las reglas detectan una alerta clínica', () => {
    const result = scorePatientCategory({
      edad: 30,
      prioridad: 'Moderada',
      pre_categorizacion_ia: {
        signos_infeccion: 'Absceso/Hinchazon con fiebre',
        intensidad_dolor: 9,
      },
    });
    expect(result).toMatchObject({
      specialty: 'Endodoncia',
      priority: 'Muy Alta',
      pain: 9,
      redFlag: true,
    });
  });

  test('los menores se derivan a odontopediatría sin intervención del LLM', () => {
    expect(scorePatientCategory({ edad: 10, respuestas_cuestionario: {} }).specialty).toBe('Odontopediatría');
  });

  test.each([
    [{ estado_periodontal: 'Periodontitis avanzada' }, 'Periodoncia'],
    [{ tipo_dolor: 'Espontaneo' }, 'Endodoncia'],
    [{ hallazgo_visual: 'Diente roto o Fractura' }, 'Prótesis Fija'],
    [{ hallazgo_visual: 'Mancha u Hoyo' }, 'Operatoria Dental'],
  ])('clasifica reglas clínicas sin usar un ranking de IA', (answers, specialty) => {
    expect(scorePatientCategory({ edad: 30, respuestas_cuestionario: answers }).specialty).toBe(specialty);
  });

  test('calcula compatibilidad horaria desde preferencias explícitas', () => {
    const morningPatient = {
      dias_disponibles: ['lunes'],
      horario_preferencia: 'mañana',
    };
    expect(calculateScore(morningPatient, candidate, category).factors.horario).toBe(1);
    expect(
      calculateScore({ ...morningPatient, dias_disponibles: ['martes'] }, candidate, category).factors.horario,
    ).toBe(0);
    expect(
      calculateScore({ ...morningPatient, horario_preferencia: 'tarde' }, candidate, category).factors.horario,
    ).toBe(0.35);
    expect(
      calculateScore({ ...morningPatient, horario_preferencia: 'flexible' }, candidate, category).factors.horario,
    ).toBe(1);
  });

  test('calcula una próxima fecha válida y rechaza días desconocidos', () => {
    expect(nextDateFor('lunes')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(() => nextDateFor('feriado')).toThrow('Día de atención inválido');
  });
});

describe('transacción de matching', () => {
  const patient = {
    id: 10,
    nombre_completo: 'Paciente Demo',
    email: 'paciente@example.cl',
    edad: 30,
    estado: 'pendiente',
    prioridad: 'Alta',
    nivel_dolor: 8,
    tipo_tratamiento_inferido: 'Endodoncia',
  };
  const available = {
    ...candidate,
    id_estudiante: 20,
    id_especialidad_estudiante: 30,
    codigo_estudiante: 'EST-2026-123456',
    nombre_completo: 'Estudiante Demo',
    email: 'student@example.cl',
    clinica: 'Clínica Integral Adulto y Gerontología',
    hora_fin: '12:00',
    capacidad_pacientes: 1,
  };
  let connection;

  beforeEach(() => {
    connection = { query: jest.fn(), release: jest.fn() };
    database.transaction.mockReset();
    database.getConnection.mockReset();
    database.getPoolConnection.mockReset();
    database.transaction.mockImplementation((work) => work(connection));
  });

  test('no crea nada si el paciente ya no está disponible', async () => {
    connection.query.mockResolvedValueOnce({ rows: [] });
    await expect(matching.matchPatient(10)).resolves.toEqual({
      success: false,
      reason: 'Paciente no disponible para asignación',
    });
    expect(connection.query).toHaveBeenCalledTimes(1);
  });

  test('mantiene pendiente un caso sin candidatos', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [patient] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(matching.matchPatient(10)).resolves.toMatchObject({
      success: false,
      category: { specialty: 'Endodoncia' },
    });
  });

  test('crea asignación, actualiza carga y encola avisos en una transacción', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [patient] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [available] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 99 }], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await matching.matchPatient(10);
    expect(result).toMatchObject({
      success: true,
      assignmentId: 99,
      estudiante: 'Estudiante Demo',
      especialidad: 'Endodoncia',
    });
    expect(connection.query).toHaveBeenCalledTimes(9);
    expect(connection.query.mock.calls[4][0]).toContain('INSERT INTO asignaciones');
    expect(connection.query.mock.calls[7][0]).toContain('INSERT INTO notificaciones_email');
  });

  test('aborta si la capacidad cambia antes de incrementar la carga', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [patient] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [available] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 99 }], rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(matching.matchPatient(10)).rejects.toThrow('La capacidad del estudiante cambió');
  });

  test('serializa ejecuciones masivas con un lock de base de datos', async () => {
    const lock = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ acquired: true }] })
        .mockResolvedValueOnce({ rows: [{ released: true }] }),
      release: jest.fn(),
    };
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 10 }, { id: 11 }] }),
    };
    database.getPoolConnection.mockResolvedValue(lock);
    database.getConnection.mockResolvedValue(pool);
    database.transaction
      .mockResolvedValueOnce({ success: true, score: 0.8 })
      .mockResolvedValueOnce({ success: false, reason: 'sin candidato' });

    await expect(matching.executeAdvancedMatching()).resolves.toMatchObject({
      success: true,
      processed: 2,
      matched: 1,
      unmatched: 1,
      averageScore: 0.8,
    });
    expect(lock.release).toHaveBeenCalled();
  });

  test('no ejecuta el lote cuando otro proceso mantiene el lock', async () => {
    const lock = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ acquired: false }] })
        .mockResolvedValueOnce({ rows: [{ released: false }] }),
      release: jest.fn(),
    };
    database.getPoolConnection.mockResolvedValue(lock);

    await expect(matching.executeAdvancedMatching()).resolves.toEqual({
      success: false,
      reason: 'Ya hay un matching en ejecución',
    });
    expect(lock.release).toHaveBeenCalled();
    expect(database.getConnection).not.toHaveBeenCalled();
  });

  test('devuelve métricas del algoritmo desde la base', async () => {
    database.getConnection.mockResolvedValue({
      query: jest.fn().mockResolvedValue({
        rows: [{ total: 2, activas: 1, completadas: 1, score_promedio: 0.75 }],
      }),
    });
    await expect(matching.getStats()).resolves.toMatchObject({
      total: 2,
      score_promedio: 0.75,
    });
  });
});
