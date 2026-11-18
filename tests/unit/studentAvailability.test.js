const StudentService = require('../../src/application/students/student.service');

describe('disponibilidad por clínica', () => {
  const code = 'EST-DISPONIBILIDAD';
  const schedule = { clinica: 'Clínica Integral Adulto y Gerontología',
    dias_semana: ['lunes', 'miercoles'], hora_inicio: '08:00', hora_fin: '12:00' };
  let repository, service;
  beforeEach(() => {
    repository = { createSchedule: jest.fn(), updateSchedule: jest.fn(), removeSchedule: jest.fn() };
    service = new StudentService({ repository });
  });

  test('envía varios días y conserva el código autenticado', () => {
    service.createSchedule(code, { ...schedule, codigo_estudiante: 'OTRO' });
    expect(repository.createSchedule).toHaveBeenCalledWith(code, schedule);
  });
  test('acepta el formato anterior al editar un horario', () => {
    service.updateSchedule(code, '12', { dia_semana: 'martes', hora_inicio: '09:00', hora_fin: '13:00' });
    expect(repository.updateSchedule).toHaveBeenCalledWith(code, 12,
      { dias_semana: ['martes'], hora_inicio: '09:00', hora_fin: '13:00' });
  });
  test.each([
    { dias_semana: [] }, { dias_semana: ['domingo'] }, { dias_semana: ['lunes', 'lunes'] },
    { dias_semana: 'lunes' }, { hora_inicio: '25:00' }, { hora_fin: '08:00' },
    { hora_inicio: '13:00' }, { clinica: '' }, { clinica: 3 },
  ])('rechaza bloques inválidos: %j', input => {
    expect(() => service.createSchedule(code, { ...schedule, ...input })).toThrow();
    expect(repository.createSchedule).not.toHaveBeenCalled();
  });
  test.each(['otro', '0', '-1', '1.5'])('rechaza un identificador inválido: %s', id => {
    expect(() => service.updateSchedule(code, id, schedule)).toThrow();
    expect(() => service.removeSchedule(code, id)).toThrow();
  });
});
