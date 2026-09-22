const express = require('express');
const rateLimit = require('express-rate-limit');
const database = require('../../../../infrastructure/database/connection');
const PatientRepository = require('../../../outbound/persistence/postgres/patient.repository');
const MatchingRepository = require('../../../outbound/persistence/postgres/matching.repository');
const PatientService = require('../../../../application/patients/patient.service');
const { preCategorizar } = require('../../../outbound/ai/triage-agent.adapter');
const { createMatchingService } = require('../../../../application/matching/matching.service');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const service = new PatientService({
  repository: new PatientRepository(database),
  matching: createMatchingService(new MatchingRepository(database)),
  triage: { preCategorizar },
});
const staffOnly = [authenticateToken, requireRole(['admin', 'coordinator'])];
const intakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/intake', intakeLimiter, async (req, res, next) => {
  try {
    const result = await service.intake(req.body);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
});

router.get('/', ...staffOnly, async (req, res, next) => {
  try {
    return res.json({ success: true, data: await service.list() });
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

router.post('/', ...staffOnly, async (req, res, next) => {
  try {
    return res.status(201).json({ success: true, data: await service.create(req.body) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', ...staffOnly, async (req, res, next) => {
  try {
    await service.update(req.params.id, req.body);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', ...staffOnly, async (req, res, next) => {
  try {
    await service.deactivate(req.params.id);
    return res.json({
      success: true,
      message: 'Paciente desactivado y asignaciones canceladas',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
