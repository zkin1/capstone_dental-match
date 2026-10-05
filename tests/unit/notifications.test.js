const Service = require('../../src/application/notifications/notifications.service');
const Provider = require('../../src/adapters/outbound/email/resend.adapter');
test('sin proveedor configurado no se reclama ni se pierde un aviso', async () => {
  const repository = { claim: jest.fn() };
  await expect(
    new Service(repository, { configured: () => false }).send(1, {}, true)
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(repository.claim).not.toHaveBeenCalled();
});
test('el proveedor debe confirmar antes de marcar enviado; los fallos quedan registrados', async () => {
  const notification = { id: 1 };
  const repo = {
    claim: jest.fn().mockResolvedValue(notification),
    freezePayload: jest.fn().mockResolvedValue({ text: 'Aviso' }),
    finish: jest.fn(),
  };
  const provider = {
    configured: () => true,
    payload: () => ({ text: 'Aviso' }),
    send: jest.fn().mockResolvedValue('mail-1'),
  };
  const service = new Service(repo, provider);
  expect((await service.send(1, {}, true)).estado).toBe('enviado');
  expect(repo.finish).toHaveBeenLastCalledWith(
    notification,
    'mail-1',
    undefined,
    {}
  );
  provider.send.mockRejectedValue(new Error('offline'));
  expect((await service.send(1, {}, true)).estado).toBe('fallido');
  expect(repo.finish).toHaveBeenLastCalledWith(
    notification,
    undefined,
    expect.any(Error),
    {}
  );
});
test('el lote para al vaciarse la cola y los avisos bloqueados no se envían', async () => {
  const repo = {
    claim: jest
      .fn()
      .mockResolvedValueOnce({ blocked: true, reason: 'Fuera de ventana' })
      .mockResolvedValue(null),
  };
  const provider = { configured: () => true, send: jest.fn() };
  expect(await new Service(repo, provider).processBatch()).toHaveLength(1);
  expect(provider.send).not.toHaveBeenCalled();
});
test('Resend recibe un payload estable y una clave de idempotencia por aviso', async () => {
  const original = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ id: 'mail-1' }) });
  try {
    expect(await new Provider().send({ id: 25 }, { text: 'Aviso' })).toBe(
      'mail-1'
    );
    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toMatch(
      /dental-match\/.*\/25/
    );
  } finally {
    global.fetch = original;
  }
});
