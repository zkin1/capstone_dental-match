const express = require('express');
const database = require('../../../../infrastructure/database/connection');
const DashboardRepository = require('../../../../adapters/outbound/persistence/postgres/dashboard.repository');
const DashboardService = require('../../../../application/dashboard/dashboard.service');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const service = new DashboardService(new DashboardRepository(database));
router.use(authenticateToken, requireRole(['admin', 'coordinator']));

router.get('/stats', async (req, res, next) => {
  try {
    return res.json({ success: true, data: await service.getStats() });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
