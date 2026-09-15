const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const database = require('../database/connection');
const routes = require('../../adapters/inbound/http/routes');
const { errorHandler, notFoundHandler } = require('../../adapters/inbound/http/middleware/errorHandler');

const app = express();
const projectRoot = path.join(__dirname, '../../..');
const frontendDir = fs.existsSync(path.join(projectRoot, 'client', 'dist'))
  ? path.join(projectRoot, 'client', 'dist')
  : path.join(projectRoot, 'legacy', 'public');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api', (req, res) => res.json({
  success: true,
  message: 'Dental Matching BFF',
  version: '3.0.0',
}));

app.get('/api/health', async (req, res) => {
  const health = await database.performHealthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: health.status === 'healthy',
    status: health.status,
    database: health,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/api/info', (req, res) => res.json({
  success: true,
  api: {
    name: 'Dental Matching API',
    version: '3.0.0',
    architecture: 'Frontend + monolito modular hexagonal + MySQL',
    matching: 'Algoritmo determinista ponderado',
    ai: 'Pre-categorización solamente',
  },
}));

app.use('/api/auth', routes.auth);
app.use('/api/pacientes', routes.patients);
app.use('/api/estudiantes', routes.students);
app.use('/api/asignaciones', routes.assignments);
app.use('/api/matching', routes.matching);
app.use('/api/dashboard', routes.dashboard);
app.use('/api/notificaciones', routes.notifications);

app.use(express.static(frontendDir, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const index = path.join(frontendDir, 'index.html');
  return fs.existsSync(index) ? res.sendFile(index) : next();
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
