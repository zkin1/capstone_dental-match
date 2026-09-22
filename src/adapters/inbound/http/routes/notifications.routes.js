const express = require('express');
const database = require('../../../../infrastructure/database/connection');
const NotificationsRepository = require('../../../../adapters/outbound/persistence/postgres/notifications.repository');
const NotificationsService = require('../../../../application/notifications/notifications.service');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const service = new NotificationsService(new NotificationsRepository(database));
router.use(authenticateToken, requireRole(['admin', 'coordinator']));

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    return res.json({ success: true, data: await service.list(limit) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
