const AuthService = require('../../../../application/auth/auth.service');
const UserRepository = require('../../../../adapters/outbound/persistence/mysql/auth.repository');
const tokenService = require('../../../../adapters/outbound/security/jwt.adapter');
const passwordHasher = require('../../../../adapters/outbound/security/password.adapter');
const { asyncHandler } = require('../middleware/errorHandler');

const cookieOptions = maxAge => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge,
});

class AuthController {
  constructor(authService = new AuthService(new UserRepository(), tokenService, passwordHasher)) {
    this.authService = authService;
  }

  setSession(res, result) {
    res.cookie('accessToken', result.tokens.accessToken, cookieOptions(24 * 60 * 60 * 1000));
    res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
  }

  register = asyncHandler(async (req, res) => {
    const result = await this.authService.register(req.body);
    res.status(201).json({ success: true, data: { user: result.user } });
  });

  login = asyncHandler(async (req, res) => {
    const result = await this.authService.login(req.body);
    this.setSession(res, result);
    res.json({ success: true, data: { user: result.user } });
  });

  refreshToken = asyncHandler(async (req, res) => {
    const result = await this.authService.refreshToken(req.cookies?.refreshToken || req.body?.refreshToken);
    this.setSession(res, { tokens: result });
    res.json({ success: true });
  });

  logout = asyncHandler(async (req, res) => {
    await this.authService.logout(req.user.id);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true });
  });

  getProfile = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await this.authService.getProfile(req.user.id) });
  });

  updateProfile = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await this.authService.updateProfile(req.user.id, req.body) });
  });

  changePassword = asyncHandler(async (req, res) => {
    const result = await this.authService.changePassword(req.user.id, req.body);
    res.json({ success: true, message: result.message });
  });

  validateToken = asyncHandler(async (req, res) => {
    res.json({ success: true, data: { user: req.user } });
  });

  getRoles = asyncHandler(async (req, res) => {
    res.json({ success: true, data: ['admin', 'coordinator', 'student'] });
  });
}

module.exports = AuthController;
