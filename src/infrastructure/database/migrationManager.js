const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { databaseSchema } = require('./connection');

class MigrationManager {
  constructor(db) {
    this.db = db;
    this.directory = path.join(__dirname, 'migrations');
  }

  async initialize() {
    const schema = databaseSchema();
    await this.db.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
        version VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        execution_time INTEGER NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async available() {
    const files = (await fs.readdir(this.directory)).filter((file) => file.endsWith('.js')).sort();
    return files.map((filename) => {
      const [version, ...name] = filename.replace(/\.js$/, '').split('_');
      return {
        version,
        name: name.join('_'),
        filename,
        path: path.join(this.directory, filename),
      };
    });
  }

  async executed() {
    const result = await this.db.query(
      'SELECT version, name, checksum, execution_time, executed_at FROM schema_migrations ORDER BY version',
    );
    return result.rows;
  }

  async pending() {
    const done = new Set((await this.executed()).map((migration) => migration.version));
    return (await this.available()).filter((migration) => !done.has(migration.version));
  }

  async run(migration) {
    const content = await fs.readFile(migration.path, 'utf8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const startedAt = Date.now();

    delete require.cache[require.resolve(migration.path)];
    const migrationModule = require(migration.path);
    if (typeof migrationModule.up !== 'function') {
      throw new Error(`${migration.filename} debe exportar up(db)`);
    }
    await migrationModule.up(this.db);

    await this.db.query(
      'INSERT INTO schema_migrations (version, name, checksum, execution_time) VALUES ($1, $2, $3, $4)',
      [migration.version, migration.name, checksum, Date.now() - startedAt],
    );
  }

  async migrate() {
    const pending = await this.pending();
    for (const migration of pending) await this.run(migration);
    return {
      executed: pending.length,
      migrations: pending.map(({ version, name }) => ({ version, name })),
    };
  }

  async status() {
    const [available, executed, pending] = await Promise.all([this.available(), this.executed(), this.pending()]);
    return { available: available.length, executed: executed.length, pending };
  }
}

module.exports = MigrationManager;
