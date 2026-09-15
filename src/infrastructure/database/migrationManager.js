const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class MigrationManager {
  constructor(db) {
    this.db = db;
    this.directory = path.join(__dirname, 'migrations');
  }

  async initialize() {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum CHAR(64) NOT NULL,
        execution_time INT NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
  }

  async available() {
    const files = (await fs.readdir(this.directory))
      .filter(file => /\.(js|sql)$/.test(file))
      .sort();
    return files.map(filename => {
      const [version, ...name] = filename.replace(/\.(js|sql)$/, '').split('_');
      return { version, name: name.join('_'), filename, path: path.join(this.directory, filename) };
    });
  }

  async executed() {
    const [rows] = await this.db.execute('SELECT version, name, checksum, execution_time, executed_at FROM schema_migrations ORDER BY version');
    return rows;
  }

  async pending() {
    const done = new Set((await this.executed()).map(migration => migration.version));
    return (await this.available()).filter(migration => !done.has(migration.version));
  }

  async run(migration) {
    const content = await fs.readFile(migration.path, 'utf8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const startedAt = Date.now();

    if (migration.filename.endsWith('.js')) {
      delete require.cache[require.resolve(migration.path)];
      const module = require(migration.path);
      if (typeof module.up !== 'function') throw new Error(`${migration.filename} debe exportar up(db)`);
      await module.up(this.db);
    } else {
      const statements = content.split(';').map(statement => statement.trim()).filter(Boolean);
      for (const statement of statements) await this.db.query(statement);
    }

    await this.db.execute(
      'INSERT INTO schema_migrations (version, name, checksum, execution_time) VALUES (?, ?, ?, ?)',
      [migration.version, migration.name, checksum, Date.now() - startedAt],
    );
  }

  async migrate() {
    const pending = await this.pending();
    for (const migration of pending) await this.run(migration);
    return { executed: pending.length, migrations: pending.map(({ version, name }) => ({ version, name })) };
  }

  async status() {
    const [available, executed, pending] = await Promise.all([this.available(), this.executed(), this.pending()]);
    return { available: available.length, executed: executed.length, pending };
  }
}

module.exports = MigrationManager;
