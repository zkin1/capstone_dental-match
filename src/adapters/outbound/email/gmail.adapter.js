const emailContent = require('./email-content');
const nodemailer = require('nodemailer');

class GmailAdapter {
  constructor() {
    // SMTP no ofrece idempotencia: un envío incierto requiere revisión manual.
    this.idempotent = false;
    this.transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS?.replace(/\s/g, ''),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  configured() {
    return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS?.trim());
  }

  payload(notification) {
    return {
      from: { name: 'Dental Match', address: process.env.SMTP_USER },
      to: [notification.email_destino],
      subject: notification.asunto,
      ...emailContent(notification),
    };
  }

  async send(_notification, payload) {
    try {
      const result = await this.transport.sendMail(payload);
      if (!result.accepted?.length || result.rejected?.length) {
        const error = new Error('Gmail rechazó el destinatario');
        error.uncertain = false;
        throw error;
      }
      return result.messageId;
    } catch (cause) {
      const status = Number.isInteger(cause.responseCode) ? ` (SMTP ${cause.responseCode})` : '';
      let hint = '';
      if (cause.code === 'EAUTH' || [534, 535].includes(cause.responseCode)) {
        hint = '. Comprueba el remitente y su contraseña de aplicación en la API';
      } else if (cause.command === 'CONN' || ['EDNS', 'ETLS'].includes(cause.code)) {
        hint = '. La API no pudo establecer la conexión SMTP con Gmail';
      } else if (cause.command === 'RCPT TO' || cause.uncertain === false) {
        hint = '. Revisa la dirección del destinatario';
      }
      const error = new Error(`No se pudo confirmar el correo con Gmail${status}${hint}`);
      // Un rechazo explícito o un fallo anterior a DATA permite reintentar.
      error.uncertain =
        cause.uncertain ??
        !(
          cause.responseCode >= 400 ||
          [
            'CONN',
            'EHLO',
            'HELO',
            'STARTTLS',
            'AUTH',
            'MAIL FROM',
            'RCPT TO',
          ].includes(cause.command) ||
          ['EAUTH', 'EENVELOPE', 'EDNS', 'ETLS'].includes(cause.code)
        );
      throw error;
    }
  }
}

module.exports = GmailAdapter;
