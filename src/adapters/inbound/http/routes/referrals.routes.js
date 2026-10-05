const express = require('express');
const database = require('../../../../infrastructure/database/connection');
const CaseRepository = require('../../../outbound/persistence/postgres/case.repository');
const MatchingRepository = require('../../../outbound/persistence/postgres/matching.repository');
const {
  CaseService,
} = require('../../../../application/assignments/case.service');
const {
  createMatchingService,
} = require('../../../../application/matching/matching.service');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const service = new CaseService(
  new CaseRepository(database),
  createMatchingService(new MatchingRepository(database))
);
router.use(authenticateToken, requireRole(['admin', 'coordinator']));
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.listReferrals() });
  } catch (error) {
    next(error);
  }
});
router.post('/:id/revision', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.review(req.params.id, req.body, req.user),
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
