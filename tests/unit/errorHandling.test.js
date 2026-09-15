const { AppError, ValidationError, DatabaseError, NotFoundError } = require('../../src/shared/errors/AppError');
const { errorHandler, notFoundHandler, asyncHandler } = require('../../src/adapters/inbound/http/middleware/errorHandler');

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

describe('errores del BFF', () => {
  test('preserva errores operacionales y detalles de validación', () => {
    const res = response();
    errorHandler(new ValidationError('Datos inválidos', [{ field: 'email' }]), { requestId: 'req-1' }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: false,
      error: { message: 'Datos inválidos', requestId: 'req-1', validationErrors: [{ field: 'email' }] },
    });
  });

  test('convierte duplicados en conflicto y oculta errores internos en producción', () => {
    const conflict = response();
    errorHandler(Object.assign(new Error('sql'), { code: 'ER_DUP_ENTRY' }), {}, conflict);
    expect(conflict.status).toHaveBeenCalledWith(409);

    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const internal = response();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('detalle secreto'), {}, internal);
    expect(internal.json.mock.calls[0][0].error.message).toBe('Error interno del servidor');
    errorSpy.mockRestore();
    process.env.NODE_ENV = previous;
  });

  test('normaliza errores de base de datos, JSON y errores operacionales externos', () => {
    const db = response();
    const dbLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(Object.assign(new Error('db'), { code: 'ER_BAD_DB_ERROR' }), { requestId: 'db-1' }, db);
    expect(db.status).toHaveBeenCalledWith(500);
    expect(db.json.mock.calls[0][0].error.errorCode).toBe('DATABASE_ERROR');
    dbLog.mockRestore();

    const invalidJson = response();
    errorHandler(Object.assign(new SyntaxError('bad json'), { status: 400 }), {}, invalidJson);
    expect(invalidJson.status).toHaveBeenCalledWith(400);

    const external = response();
    errorHandler({ isOperational: true, statusCode: 422, message: 'fuera de rango' }, {}, external);
    expect(external.status).toHaveBeenCalledWith(422);
    expect(new NotFoundError('Paciente', 8).message).toContain('ID 8');
    expect(new DatabaseError().errorCode).toBe('DATABASE_ERROR');
  });

  test('genera 404 y propaga rechazos async', async () => {
    const missing = jest.fn();
    notFoundHandler({ originalUrl: '/api/no-existe' }, {}, missing);
    expect(missing.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(missing.mock.calls[0][0].statusCode).toBe(404);

    const next = jest.fn();
    asyncHandler(async () => { throw new Error('fallo'); })({}, {}, next);
    await new Promise(resolve => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'fallo' }));
  });
});
