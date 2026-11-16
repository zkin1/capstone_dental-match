const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { service, processEmailOutbox } = require('../email-outbox');

const router = express.Router();
const {
  numericId,
} = require('../../../../application/assignments/case.service');
router.get('/procesar-cola', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(req.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (
    !secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({ success: false });
  }

  try {
    return res.json({ success: true, data: await processEmailOutbox() });
  } catch (error) {
    return next(error);
  }
});

router.use(authenticateToken, requireRole(['admin', 'coordinator']));

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
      200
    );
    return res.json({ success: true, data: await service.list(limit) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/enviar', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.send(numericId(req.params.id), req.user, true),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
