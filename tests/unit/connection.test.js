const database = require('../../src/infrastructure/database/connection');

test('el matching masivo requiere al menos dos conexiones', async () => {
  const previous = process.env.DB_CONNECTION_LIMIT;
  process.env.DB_CONNECTION_LIMIT = '1';
  try {
    await expect(database.initialize()).rejects.toThrow('DB_CONNECTION_LIMIT debe ser un entero >= 2');
  } finally {
    if (previous === undefined) delete process.env.DB_CONNECTION_LIMIT;
    else process.env.DB_CONNECTION_LIMIT = previous;
  }
});
