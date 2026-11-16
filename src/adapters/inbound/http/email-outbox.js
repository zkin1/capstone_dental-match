const { waitUntil } = require('@vercel/functions');
const database = require('../../../infrastructure/database/connection');
const NotificationsRepository = require('../../outbound/persistence/postgres/notifications.repository');
const NotificationsService = require('../../../application/notifications/notifications.service');
const createEmailProvider = require('../../outbound/email/provider');

const service = new NotificationsService(
  new NotificationsRepository(database),
  createEmailProvider()
);

async function processEmailOutbox() {
  const cutoff = process.env.EMAIL_AUTOMATIC_FROM;
  if (!cutoff) return { enabled: false };
  const timestamp = new Date(cutoff);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== cutoff) {
    throw new Error('EMAIL_AUTOMATIC_FROM debe tener formato UTC YYYY-MM-DDTHH:mm:ss.sssZ');
  }

  // Evita iniciar más intentos cuando el lote ya lleva tiempo en ejecución.
  const results = await service.processBatch(20, {
    createdFrom: cutoff,
    deadline: Date.now() + 15000,
  });
  return {
    enabled: true,
    sent: results.filter((result) => result.estado === 'enviado').length,
    failed: results.filter((result) => result.estado === 'fallido').length,
    skipped: results.filter((result) => result.blocked).length,
  };
}

function scheduleEmailOutbox() {
  if (!process.env.EMAIL_AUTOMATIC_FROM) return;

  waitUntil(processEmailOutbox().catch((error) => {
    console.error('No se pudo procesar la cola de correo:', error.message);
  }));
}

module.exports = { service, processEmailOutbox, scheduleEmailOutbox };
