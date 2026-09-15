const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/auth.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const controller = new AuthController();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/login', loginLimiter, controller.login);
router.post('/refresh-token', controller.refreshToken);
router.post('/logout', authenticateToken, controller.logout);
router.get('/validate-token', authenticateToken, controller.validateToken);
router.get('/profile', authenticateToken, controller.getProfile);
router.put('/profile', authenticateToken, controller.updateProfile);
router.put('/change-password', authenticateToken, controller.changePassword);
router.post('/register', authenticateToken, requireRole('admin'), controller.register);
router.get('/roles', authenticateToken, requireRole('admin'), controller.getRoles);

module.exports = router;
