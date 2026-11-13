const express = require('express');
const rateLimit = require('express-rate-limit');
const database = require('../../../../infrastructure/database/connection');
const StudentRepository = require('../../../outbound/persistence/postgres/student.repository');
const StudentService = require('../../../../application/students/student.service');
const studentCodeService = require('../../../outbound/persistence/postgres/student-code.adapter');
const passwordHasher = require('../../../outbound/security/password.adapter');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const service = new StudentService({
  repository: new StudentRepository(database, studentCodeService),
  passwordHasher,
});
const staffOnly = [authenticateToken, requireRole(['admin', 'coordinator'])];
const publicRegistrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de registro. Intenta nuevamente más tarde.',
  },
});

router.post('/register', publicRegistrationLimit, async (req, res, next) => {
  try {
    const result = await service.register(req.body, { approved: false });
    return res.status(201).json({
      success: true,
      message: 'Registro recibido. Coordinación debe aprobar tu perfil antes de que puedas iniciar sesión.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

const studentOnly = [authenticateToken, requireRole('student')];

router.get('/mi-disponibilidad', ...studentOnly, async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.availability(req.user.codigo_estudiante) });
  } catch (error) { next(error); }
});

router.put('/mi-disponibilidad/horarios/:id', ...studentOnly, async (req, res, next) => {
  try {
    await service.updateSchedule(req.user.codigo_estudiante, req.params.id, req.body);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.put('/mi-disponibilidad/ausencias/:fecha', ...studentOnly, async (req, res, next) => {
  try {
    await service.updateAbsence(req.user.codigo_estudiante, req.params.fecha, true);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.delete('/mi-disponibilidad/ausencias/:fecha', ...studentOnly, async (req, res, next) => {
  try {
    await service.updateAbsence(req.user.codigo_estudiante, req.params.fecha, false);
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post('/', ...staffOnly, async (req, res, next) => {
  try {
    const data = await service.register(req.body);
    return res.status(201).json({ success: true, message: 'Estudiante creado', data });
  } catch (error) {
    return next(error);
  }
});

router.get('/', ...staffOnly, async (req, res, next) => {
  try {
    const data = await service.list();
    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    return next(error);
  }
});

router.get('/stats', ...staffOnly, async (req, res, next) => {
  try {
    return res.json({ success: true, data: await service.getStats() });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/cuenta', ...staffOnly, async (req, res, next) => {
  try {
    const data = await service.setAccountStatus(req.params.id, req.body?.status);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', ...staffOnly, async (req, res, next) => {
  try {
    await service.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Estudiante actualizado' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', ...staffOnly, async (req, res, next) => {
  try {
    await service.deactivate(req.params.id);
    return res.json({ success: true, message: 'Estudiante desactivado' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
