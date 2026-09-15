const { executeQuery } = require('../../../../infrastructure/database/connection');
const { parseJson } = require('../../../../domain/common');

function normalize(user) {
  if (!user) return null;
  return {
    ...user,
    permissions: parseJson(user.permissions, []),
  };
}

class UserRepository {
  async findById(id) {
    const { rows } = await executeQuery('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return normalize(rows[0]);
  }

  async findByEmail(email) {
    const { rows } = await executeQuery(
      "SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1",
      [email],
    );
    return normalize(rows[0]);
  }

  async findByStudentCode(code) {
    const { rows } = await executeQuery(
      "SELECT * FROM users WHERE codigo_estudiante = ? AND role = 'student' LIMIT 1",
      [code],
    );
    return normalize(rows[0]);
  }

  async create(user) {
    const { result } = await executeQuery(
      `INSERT INTO users
       (email, password, nombre_completo, role, permissions, status, telefono, codigo_estudiante)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        user.email,
        user.password,
        user.nombre_completo,
        user.role,
        JSON.stringify(user.permissions || []),
        user.telefono || null,
        user.codigo_estudiante || null,
      ],
    );
    return this.findById(result.insertId);
  }

  async updateRefreshToken(id, hash) {
    return executeQuery('UPDATE users SET refresh_token_hash = ? WHERE id = ?', [hash, id]);
  }

  async updateLastLogin(id) {
    return executeQuery('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  }

  async updatePassword(id, password) {
    return executeQuery('UPDATE users SET password = ?, refresh_token_hash = NULL WHERE id = ?', [password, id]);
  }

  async update(id, changes) {
    const allowed = ['nombre_completo', 'telefono'];
    const entries = Object.entries(changes)
      .filter(([key, value]) => allowed.includes(key) && value !== undefined);
    if (!entries.length) return this.findById(id);
    await executeQuery(
      `UPDATE users SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => value), id],
    );
    return this.findById(id);
  }
}

module.exports = UserRepository;
