jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const nodemailer = require('nodemailer');
const GmailAdapter = require('../../src/adapters/outbound/email/gmail.adapter');
const ResendAdapter = require('../../src/adapters/outbound/email/resend.adapter');
const createProvider = require('../../src/adapters/outbound/email/provider');

let sendMail;
beforeEach(() => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    EMAIL_PROVIDER: 'gmail',
    SMTP_USER: 'sender@example.test',
    SMTP_PASS: 'fake app password',
  });
  sendMail = jest.fn().mockResolvedValue({
    accepted: ['student@example.test'],
    rejected: [],
    messageId: 'gmail-1',
  });
  nodemailer.createTransport.mockReturnValue({ sendMail });
});

test('selecciona Gmail con TLS y contraseña de aplicación sin espacios', () => {
  const provider = createProvider();
  expect(provider).toBeInstanceOf(GmailAdapter);
  expect(provider.configured()).toBe(true);
  expect(provider.idempotent).toBe(false);
  expect(nodemailer.createTransport).toHaveBeenCalledWith(
    expect.objectContaining({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'sender@example.test', pass: 'fakeapppassword' },
    })
  );
  delete process.env.SMTP_PASS;
  expect(provider.configured()).toBe(false);
});

test('conserva Resend como predeterminado y rechaza un proveedor desconocido', () => {
  delete process.env.EMAIL_PROVIDER;
  expect(createProvider()).toBeInstanceOf(ResendAdapter);
  process.env.EMAIL_PROVIDER = 'typo';
  expect(createProvider).toThrow('EMAIL_PROVIDER');
});

test('envía el contenido al destinatario y confirma la aceptación de Gmail', async () => {
  const provider = createProvider();
  const notification = {
    email_destino: 'student@example.test',
    asunto: 'Nueva asignación',
    mensaje: 'Revisa la plataforma.',
  };
  const payload = provider.payload(notification);
  expect(payload).toEqual({
    from: { name: 'Dental Match', address: 'sender@example.test' },
    to: ['student@example.test'],
    subject: 'Nueva asignación',
    text: 'Revisa la plataforma.',
  });
  await expect(provider.send(notification, payload)).resolves.toBe('gmail-1');
  expect(sendMail).toHaveBeenCalledWith(payload);
});

test.each([
  [{ code: 'EAUTH', command: 'AUTH PLAIN', responseCode: 535 }, false],
  [{ code: 'EDNS', command: 'CONN' }, false],
  [{ code: 'ETIMEDOUT', command: 'CONN' }, false],
  [{ command: 'RCPT TO', responseCode: 550 }, false],
  [{ command: 'DATA', responseCode: 451 }, false],
  [{ command: 'DATA', code: 'ETIMEDOUT' }, true],
  [{ code: 'ECONNRESET' }, true],
])(
  'clasifica el error SMTP %j sin revelar credenciales',
  async (details, uncertain) => {
    sendMail.mockRejectedValue(
      Object.assign(new Error('detalle privado'), details)
    );
    const error = await createProvider()
      .send({}, {})
      .catch((e) => e);
    expect(error.uncertain).toBe(uncertain);
    expect(error.message).not.toContain('detalle privado');
  }
);

test('un destinatario rechazado no se marca como enviado', async () => {
  sendMail.mockResolvedValue({
    accepted: [],
    rejected: ['student@example.test'],
  });
  await expect(createProvider().send({}, {})).rejects.toMatchObject({
    uncertain: false,
  });
});
