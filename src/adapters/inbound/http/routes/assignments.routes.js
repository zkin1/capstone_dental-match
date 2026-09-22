const express = require('express');
const database = require('../../../../infrastructure/database/connection');
const AssignmentRepository = require('../../../outbound/persistence/postgres/assignment.repository');
const AssignmentService = require('../../../../application/assignments/assignment.service');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const service = new AssignmentService(new AssignmentRepository(database));
router.use(authenticateToken);

router.get('/mias', requireRole('student'), async (req, res, next) => {
  try {
    const result = await service.listMine(req.user.codigo_estudiante);
    return res.json({
      success: true,
      estudiante: result.student,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/', requireRole(['admin', 'coordinator']), async (req, res, next) => {
  try {
    const data = await service.list();
    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    return next(error);
  }
});

router.get('/stats', requireRole(['admin', 'coordinator']), async (req, res, next) => {
  try {
    return res.json({ success: true, data: await service.getStats() });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireRole(['admin', 'coordinator', 'student']), async (req, res, next) => {
  try {
    const result = await service.update(req.params.id, req.body, req.user);
    return res.json({ success: true, message: result.message });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireRole(['admin', 'coordinator']), async (req, res, next) => {
  try {
    const result = await service.update(req.params.id, { estado: 'cancelado' }, req.user);
    return res.json({ success: true, message: result.message });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
