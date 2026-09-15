const crypto = require('crypto');

async function generateUniqueCode(connection) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `EST-${year}-${crypto.randomInt(100000, 1000000)}`;
    const [rows] = await connection.execute(
      'SELECT 1 FROM estudiantes_odontologia WHERE codigo_estudiante = ? LIMIT 1',
      [code],
    );
    if (!rows.length) return code;
  }
  throw new Error('No se pudo generar un código de estudiante único');
}

module.exports = { generateUniqueCode };
