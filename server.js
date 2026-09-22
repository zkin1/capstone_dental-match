#!/usr/bin/env node

require('dotenv').config();
// Las fechas de cita pertenecen al dominio local chileno, no a la zona del host.
process.env.TZ ||= 'America/Santiago';

const app = require('./src/infrastructure/http/app');
const database = require('./src/infrastructure/database/connection');

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    if (
      !process.env[key] ||
      process.env[key].length < 24 ||
      /change|cambia|cambiar|replace|example|temporary|secret/i.test(process.env[key])
    ) {
      throw new Error(`${key} debe ser un secreto seguro en producción`);
    }
  }
  if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
    throw new Error('Define DATABASE_URL o DB_PASSWORD para PostgreSQL en producción');
  }
  if (
    !process.env.DATABASE_URL &&
    (process.env.DB_PASSWORD.length < 16 ||
      /change|cambia|cambiar|replace|example|temporary|password/i.test(process.env.DB_PASSWORD))
  ) {
    throw new Error('DB_PASSWORD debe ser un secreto seguro en producción');
  }
  if (process.env.DATABASE_URL && !/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL)) {
    throw new Error('DATABASE_URL debe usar el protocolo PostgreSQL');
  }
  if (process.env.AI_AGENT_URL && (!process.env.AI_AGENT_TOKEN || process.env.AI_AGENT_TOKEN.length < 24)) {
    throw new Error('AI_AGENT_TOKEN debe tener al menos 24 caracteres cuando se configura AI_AGENT_URL');
  }
}

async function start() {
  validateProductionConfig();
  await database.initialize();

  const server = app.listen(port, host, () => {
    console.log(`Dental Matching BFF listo en http://${host}:${port}`);
  });
  server.timeout = Number(process.env.SERVER_TIMEOUT) || 30000;

  const shutdown = async (signal) => {
    console.log(`${signal}: cerrando servidor`);
    server.close(async () => {
      await database.closePool();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  start().catch((error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  });
}

// Vercel importa la aplicación; el arranque local sigue usando start().
validateProductionConfig();
module.exports = app;
module.exports.start = start;
