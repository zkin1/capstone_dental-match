const express = require('express');
const database = require('../../../../infrastructure/database/connection');
const MatchingRepository = require('../../../outbound/persistence/postgres/matching.repository');
const triageAgent = require('../../../outbound/ai/triage-agent.adapter');
const { createMatchingService } = require('../../../../application/matching/matching.service');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { AppError, ValidationError } = require('../../../../shared/errors/AppError');

const router = express.Router();
const matching = createMatchingService(new MatchingRepository(database));
router.use(authenticateToken, requireRole(['admin', 'coordinator']));

router.get('/weights', (req, res) => {
  res.json({ success: true, data: matching.WEIGHTS });
});

router.get('/stats', async (req, res, next) => {
  try {
    res.json({ success: true, data: await matching.getStats() });
  } catch (error) {
    next(error);
  }
});

router.get('/pending', async (req, res, next) => {
  try {
    res.json({ success: true, data: await matching.listPending() });
  } catch (error) {
    next(error);
  }
});

router.post('/agent-preview', async (req, res, next) => {
  try {
    const { answers, edad = 30 } = req.body || {};
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || !Object.keys(answers).length) {
      throw new ValidationError('Debes enviar respuestas para analizar');
    }
    if (!Number.isInteger(Number(edad)) || Number(edad) < 1 || Number(edad) > 120) {
      throw new ValidationError('La edad debe estar entre 1 y 120');
    }

    const startedAt = Date.now();
    const [agent, preCategorizacion] = await Promise.all([
    triageAgent.getStatus(),
    triageAgent.preCategorizar(answers),
  ]);
    if (!preCategorizacion) {
      throw new AppError('El agente no respondió. Intenta nuevamente.', 503, 'AI_AGENT_UNAVAILABLE');
    }

    const categoria = matching.scorePatientCategory({
      edad: Number(edad),
      prioridad: 'Moderada',
      pre_categorizacion_ia: preCategorizacion,
    });
    res.json({
      success: true,
      data: {
        agent: agent || { status: 'ok', provider: 'configurado', model: 'no informado' },
        responseTime: Date.now() - startedAt,
        preCategorizacion,
        categoria,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/auto', async (req, res, next) => {
  try {
    const result = await matching.executeAdvancedMatching();
    res.status(result.success ? 200 : 409).json({ success: result.success, data: result, message: result.reason });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
