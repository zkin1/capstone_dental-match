#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const database = require('../src/infrastructure/database/connection');

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Define ADMIN_EMAIL con un email válido');
  if (!PASSWORD_PATTERN.test(password || '')) {
    throw new Error('Define ADMIN_PASSWORD con 12 caracteres, mayúscula, minúscula, número y símbolo');
  }

  await database.initialize();
  const db = await database.getConnection();
  const [existing] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length) throw new Error('Ya existe una cuenta con ADMIN_EMAIL');
  await db.execute(
    `INSERT INTO users (email, password, nombre_completo, role, permissions, status)
     VALUES (?, ?, ?, 'admin', ?, 'active')`,
    [
      email,
      await bcrypt.hash(password, 12),
      name,
      JSON.stringify(['users:write', 'patients:write', 'students:write', 'assignments:write', 'matching:execute']),
    ],
  );
  console.log(`Administrador creado: ${email}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => database.closePool());
