const { executeQuery } = require('../../../../infrastructure/database/connection');
const { parseJson } = require('../../../../domain/common');

function normalize(user) {
  if (!user) return null;
  return { ...user, permissions: parseJson(user.permissions, []) };
}

class UserRepository {
  async findById(id) {
    const { rows } = await executeQuery('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return normalize(rows[0]);
  }

  async findByEmail(email) {
    const { rows } = await executeQuery("SELECT * FROM users WHERE email = $1 AND status = 'active' LIMIT 1", [email]);
    return normalize(rows[0]);
  }

  async findByStudentCode(code) {
    const { rows } = await executeQuery(
      "SELECT * FROM users WHERE codigo_estudiante = $1 AND role = 'student' LIMIT 1",
      [code],
    );
    return normalize(rows[0]);
  }

  async create(user) {
    const { rows } = await executeQuery(
      `INSERT INTO users
       (email, password, nombre_completo, role, permissions, status, telefono, codigo_estudiante)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
       RETURNING *`,
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
    return normalize(rows[0]);
  }

  async updateRefreshToken(id, hash) {
    return executeQuery('UPDATE users SET refresh_token_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      hash,
      id,
    ]);
  }

  async updateLastLogin(id) {
    return executeQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    );
  }

  async updatePassword(id, password) {
    return executeQuery(
      'UPDATE users SET password = $1, refresh_token_hash = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password, id],
    );
  }

  async update(id, changes) {
    const allowed = ['nombre_completo', 'telefono'];
    const entries = Object.entries(changes).filter(([key, value]) => allowed.includes(key) && value !== undefined);
    if (!entries.length) return this.findById(id);

    const values = entries.map(([, value]) => value);
    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(id);
    await executeQuery(
      `UPDATE users
          SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}`,
      values,
    );
    return this.findById(id);
  }
}

module.exports = UserRepository;
