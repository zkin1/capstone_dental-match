const express = require('express');
const database = require('../../../../infrastructure/database/connection');
const MatchingRepository = require('../../../outbound/persistence/postgres/matching.repository');
const { createMatchingService } = require('../../../../application/matching/matching.service');
const { authenticateToken, requireRole } = require('../middleware/auth');

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

router.post('/auto', async (req, res, next) => {
  try {
    const result = await matching.executeAdvancedMatching();
    res.status(result.success ? 200 : 409).json({ success: result.success, data: result, message: result.reason });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
