const mysql = require('mysql2/promise');

let pool;

function config() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dental_matching',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
  };
}

async function initialize() {
  if (!pool) pool = mysql.createPool(config());
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
  return pool;
}

async function getConnection() {
  return pool || initialize();
}

async function getPoolConnection() {
  return (await getConnection()).getConnection();
}

async function executeQuery(sql, params = []) {
  const [rows, fields] = await (await getConnection()).execute(sql, params);
  return { rows, fields, result: rows };
}

async function transaction(work) {
  const connection = await getPoolConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function performHealthCheck() {
  const startedAt = Date.now();
  try {
    await executeQuery('SELECT 1 AS ok');
    return { status: 'healthy', responseTime: Date.now() - startedAt };
  } catch {
    return { status: 'unhealthy', responseTime: Date.now() - startedAt };
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
};
