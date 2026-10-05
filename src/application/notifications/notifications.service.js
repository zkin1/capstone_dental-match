const { AppError, ConflictError } = require('../../shared/errors/AppError');
class NotificationsService {
  constructor(repository, provider) {
    if (!repository)
      throw new Error('NotificationsService requiere un repositorio');
    this.repository = repository;
    this.provider = provider;
  }

  list(limit) {
    return this.repository.list(limit);
  }

  async send(id, user, manual = false) {
    if (!this.provider?.configured())
      throw new AppError(
        'Configura RESEND_API_KEY y EMAIL_FROM para enviar correos',
        503,
        'EMAIL_NOT_CONFIGURED'
      );
    const notification = await this.repository.claim(id, manual);
    if (!notification) return null;
    if (notification.blocked) {
      if (manual) throw new ConflictError(notification.reason);
      return notification;
    }
    let providerId;
    let failure;
    try {
      const payload = await this.repository.freezePayload(
        notification,
        this.provider.payload(notification)
      );
      providerId = await this.provider.send(notification, payload);
    } catch (error) {
      failure = error;
    }
    // Persisting the acknowledgement is separate from provider failures; a DB error leaves the claim recoverable.
    await this.repository.finish(notification, providerId, failure, user);
    return {
      id: notification.id,
      estado: failure ? 'fallido' : 'enviado',
      message: failure?.message || 'Correo aceptado por el proveedor',
    };
  }
  async processBatch(limit = 20) {
    const results = [];
    for (let i = 0; i < limit; i++) {
      const result = await this.send();
      if (!result) break;
      results.push(result);
    }
    return results;
  }
}

module.exports = NotificationsService;
