const express = require('express');
const UserRepository = require('../../../outbound/persistence/postgres/auth.repository');
const AuthService = require('../../../../application/auth/auth.service');
const UserManagementService = require('../../../../application/auth/user-management.service');
const tokenService = require('../../../outbound/security/jwt.adapter');
const passwordHasher = require('../../../outbound/security/password.adapter');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();
const repository = new UserRepository();
const service = new UserManagementService(
  repository,
  new AuthService(repository, tokenService, passwordHasher)
);
router.use(authenticateToken, requireRole('admin'));
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.list() });
  } catch (error) {
    next(error);
  }
});
router.post('/', async (req, res, next) => {
  try {
    res
      .status(201)
      .json({ success: true, data: await service.create(req.body) });
  } catch (error) {
    next(error);
  }
});
router.put('/:id', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.update(req.params.id, req.body),
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
