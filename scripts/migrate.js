#!/usr/bin/env node
require('dotenv').config();
const database = require('../src/infrastructure/database/connection');
const MigrationManager = require('../src/infrastructure/database/migrationManager');

async function main() {
  await database.initialize();
  const manager = new MigrationManager(await database.getConnection());
  await manager.initialize();

  if (process.argv[2] === 'status') {
    const status = await manager.status();
    console.log(`Disponibles: ${status.available} · Ejecutadas: ${status.executed} · Pendientes: ${status.pending.length}`);
    for (const migration of status.pending) console.log(`- ${migration.version} ${migration.name}`);
  } else {
    const result = await manager.migrate();
    console.log(result.executed ? `Migraciones ejecutadas: ${result.executed}` : 'Base de datos actualizada');
    for (const migration of result.migrations) console.log(`- ${migration.version} ${migration.name}`);
  }
}

main()
  .catch(error => {
    console.error(`Error de migración: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => database.closePool());
