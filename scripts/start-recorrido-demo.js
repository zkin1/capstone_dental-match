// Entorno local aislado para revisar el recorrido mientras Supabase se restaura.
const fs = require('node:fs');
const assert = require('node:assert/strict');
require('dotenv').config({ quiet: true });
const demo = require('dotenv').parse(fs.readFileSync('.env.e2e.demo'));
assert(
  !process.env.DATABASE_URL &&
    ['localhost', '127.0.0.1'].includes(process.env.DB_HOST),
  'Este comando solo admite PostgreSQL local; no ejecuta migraciones en la nube'
);
assert(demo.E2E_PASSWORD, 'Falta la contraseña aleatoria en .env.e2e.demo');
assert(fs.existsSync('client/dist/index.html'), 'Primero compila el cliente');
process.env.DB_SCHEMA = 'dm_e2e_20261020';
process.env.NODE_ENV = 'development';
process.env.TZ = 'America/Santiago';
const database = require('../src/infrastructure/database/connection');
const MigrationManager = require('../src/infrastructure/database/migrationManager');

async function main() {
  const pool = await database.initialize();
  const manager = new MigrationManager(pool);
  await manager.initialize();
  await manager.migrate();
  const hash = await require('bcryptjs').hash(demo.E2E_PASSWORD, 12);
  const sql = fs
    .readFileSync(
      require('node:path').resolve(
        __dirname,
        '..',
        'instrucciones para Nota 2 Capstone',
        'sql',
        'seed-recorrido-20261020.sql'
      ),
      'utf8'
    )
    .replaceAll('__DEMO_BCRYPT_HASH__', hash)
    .replace('TO dental_match, pg_catalog', 'TO dm_e2e_20261020, pg_catalog')
    .replace('API publicada', 'instalación local de prueba');
  await pool.query(sql);
  const app = require('../src/infrastructure/http/app');
  const server = app.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${server.address().port}`;
    let privateConfig = fs.readFileSync('.env.e2e.demo', 'utf8');
    privateConfig = privateConfig.replace(/^E2E_LOCAL_BASE_URL=.*\n?/m, '');
    fs.writeFileSync(
      '.env.e2e.demo',
      `${privateConfig.trimEnd()}\nE2E_LOCAL_BASE_URL=${base}\n`
    );
    console.log(
      JSON.stringify({
        environment: 'local',
        base,
        schema: process.env.DB_SCHEMA,
        seeded: true,
      })
    );
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(async () => {
        await database.closePool();
        process.exit(0);
      });
    });
  }
}

main().catch(async (error) => {
  console.error(error.message);
  await database.closePool();
  process.exitCode = 1;
});
