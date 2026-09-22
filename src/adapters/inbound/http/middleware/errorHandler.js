const { AppError, ConflictError, DatabaseError, ValidationError } = require('../../../../shared/errors/AppError');

function normalizeError(error) {
  if (error instanceof AppError) return error;
  if (error.isOperational && error.statusCode) {
    return new AppError(error.message, error.statusCode, error.errorCode || 'REQUEST_ERROR');
  }
  if (error.code === '23505') return new ConflictError('Ya existe un registro con esos datos');
  if (/^(08|22|23|40|42|53|54|55|57|58)/.test(error.code || '') || error.code === 'ECONNREFUSED') {
    return new DatabaseError();
  }
  if (error instanceof SyntaxError && error.status === 400) return new ValidationError('El cuerpo JSON no es válido');
  return new AppError(process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : error.message);
}

function errorHandler(error, req, res, _next) {
  const normalized = normalizeError(error);
  if (normalized.statusCode >= 500) {
    console.error(`[${req.requestId || '-'}]`, error);
  }
  return res.status(normalized.statusCode).json({
    success: false,
    error: {
      message: normalized.message,
      errorCode: normalized.errorCode,
      requestId: req.requestId,
      ...(normalized.errors?.length ? { validationErrors: normalized.errors } : {}),
    },
  });
}

function notFoundHandler(req, res, next) {
  next(new AppError(`Ruta ${req.originalUrl} no encontrada`, 404, 'ROUTE_NOT_FOUND'));
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFoundHandler, asyncHandler };
