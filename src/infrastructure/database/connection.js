const { Pool } = require('pg');

let pool;

function databaseSchema() {
  const schema = process.env.DB_SCHEMA || 'dental_match';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) {
    throw new Error('DB_SCHEMA debe ser un identificador PostgreSQL válido');
  }
  return schema;
}

function config() {
  const common = {
    max: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
    application_name: 'dental-match',
    options: `-c search_path=${databaseSchema()},public -c timezone=UTC`,
  };

  if (process.env.DATABASE_URL) {
    return { ...common, connectionString: process.env.DATABASE_URL };
  }

  return {
    ...common,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'dental_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_matching',
  };
}

async function initialize() {
  if (!pool) {
    pool = new Pool(config());
    pool.on('error', (error) => console.error('Error inesperado del pool PostgreSQL:', error.message));
  }

  const client = await pool.connect();
  try {
    await client.query('SELECT 1 AS ok');
  } finally {
    client.release();
  }
  return pool;
}

async function getConnection() {
  return pool || initialize();
}

async function getPoolConnection() {
  return (await getConnection()).connect();
}

async function executeQuery(sql, params = []) {
  const result = await (await getConnection()).query(sql, params);
  return { rows: result.rows, fields: result.fields, result };
}

async function transaction(work) {
  const client = await getPoolConnection();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function performHealthCheck() {
  const startedAt = Date.now();
  try {
    await executeQuery('SELECT 1 AS ok');
    return {
      status: 'healthy',
      engine: 'postgresql',
      responseTime: Date.now() - startedAt,
    };
  } catch {
    return {
      status: 'unhealthy',
      engine: 'postgresql',
      responseTime: Date.now() - startedAt,
    };
  }
}

async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}

module.exports = {
  initialize,
  getConnection,
  getPoolConnection,
  executeQuery,
  transaction,
  performHealthCheck,
  closePool,
  databaseSchema,
};
