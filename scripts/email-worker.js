require('dotenv').config();
const database = require('../src/infrastructure/database/connection');
const Repository = require('../src/adapters/outbound/persistence/postgres/notifications.repository');
const Provider = require('../src/adapters/outbound/email/resend.adapter');
const Service = require('../src/application/notifications/notifications.service');
const service = new Service(new Repository(database), new Provider());
let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});
async function main() {
  await database.initialize();
  do {
    const results = await service.processBatch();
    console.log(
      `Cola: ${results.filter((r) => r.estado === 'enviado').length} enviados; ${results.filter((r) => r.estado === 'fallido' || r.blocked).length} sin confirmar`
    );
    if (process.argv.includes('--once') || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } while (!stopping);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => database.closePool());
