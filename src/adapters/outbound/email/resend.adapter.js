class ResendAdapter {
  configured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }
  payload(notification) {
    return {
      from: process.env.EMAIL_FROM,
      to: [notification.email_destino],
      subject: notification.asunto,
      text:
        notification.mensaje ||
        'Dental Match: tienes una nueva asignación. Revisa tu caso en la plataforma.',
    };
  }
  async send(notification, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `dental-match/${process.env.EMAIL_INSTANCE_ID || 'capstone'}/${notification.id}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.id) {
        const error = new Error(
          `Proveedor rechazó el envío (HTTP ${response.status})`
        );
        error.uncertain = response.status >= 500 || response.status === 409;
        throw error;
      }
      return data.id;
    } catch (error) {
      if (error.uncertain === undefined) error.uncertain = true;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
module.exports = ResendAdapter;
