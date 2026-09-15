const CLINICS = Object.freeze({
  child: 'Clínica para el Niño y Adolescente',
  adult: 'Clínica Integral Adulto y Gerontología',
});

class StudentRepository {
  constructor(database, codeGenerator) {
    this.database = database;
    this.codeGenerator = codeGenerator;
  }

  async register(student, passwordHash) {
    return this.database.transaction(async connection => {
      const [students] = await connection.execute(
        'SELECT 1 FROM estudiantes_odontologia WHERE email = ? LIMIT 1', [student.email],
      );
      const [users] = await connection.execute(
        'SELECT 1 FROM users WHERE email = ? LIMIT 1', [student.email],
      );
      if (students.length || users.length) return { duplicate: true };

      const code = await this.codeGenerator.generateUniqueCode(connection);
      const [insert] = await connection.execute(
        `INSERT INTO estudiantes_odontologia
         (codigo_estudiante, nombre_completo, año_carrera, telefono, email, universidad, ciudad,
          casos_necesarios, casos_activos, casos_completados, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'activo')`,
        [
          code, student.nombre_completo, student.año_carrera, student.telefono,
          student.email, student.universidad, student.ciudad, student.casos_necesarios,
        ],
      );

      for (const specialty of student.specialties) {
        const clinic = specialty === 'Odontopediatría' ? CLINICS.child : CLINICS.adult;
        for (const slot of student.schedules) {
          await connection.execute(
            `INSERT INTO especialidades_estudiante
             (id_estudiante, especialidad, clinica, dia_semana, hora_inicio, hora_fin, capacidad_pacientes, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [insert.insertId, specialty, clinic, slot.dia, slot.hora_inicio, slot.hora_fin,
              Number(slot.capacidad_pacientes) || 1],
          );
        }
      }

      await connection.execute(
        `INSERT INTO users
         (email, password, nombre_completo, role, permissions, codigo_estudiante, telefono, status)
         VALUES (?, ?, ?, 'student', ?, ?, ?, 'active')`,
        [student.email, passwordHash, student.nombre_completo, JSON.stringify(['assignments:own']), code, student.telefono],
      );
      return { id: insert.insertId, codigo_estudiante: code };
    });
  }

  async list() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT e.id, e.codigo_estudiante, e.nombre_completo, e.año_carrera, e.telefono, e.email,
              e.universidad, e.ciudad, e.estado, e.casos_activos, e.casos_completados,
              e.casos_necesarios, e.fecha_registro,
              GROUP_CONCAT(DISTINCT ee.especialidad ORDER BY ee.especialidad SEPARATOR ', ') AS especialidades
         FROM estudiantes_odontologia e
         LEFT JOIN especialidades_estudiante ee ON ee.id_estudiante = e.id AND ee.activo = 1
        GROUP BY e.id
        ORDER BY e.estado = 'activo' DESC, e.nombre_completo ASC`,
    );
    return rows;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total_estudiantes,
              SUM(estado = 'activo') AS activos,
              SUM(casos_activos) AS total_casos_activos,
              SUM(casos_completados) AS total_casos_completados
         FROM estudiantes_odontologia`,
    );
    return rows[0];
  }

  async update(id, changes, decide) {
    return this.database.transaction(async connection => {
      const [students] = await connection.execute(
        'SELECT codigo_estudiante, casos_activos FROM estudiantes_odontologia WHERE id = ? FOR UPDATE', [id],
      );
      const student = students[0];
      if (!student) return { missing: true };
      const decision = decide(student);
      if (!decision.success) return decision;

      const entries = Object.entries(changes);
      await connection.execute(
        `UPDATE estudiantes_odontologia SET ${entries.map(([field]) => `${field} = ?`).join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`,
        [...entries.map(([, value]) => value), id],
      );

      const userFields = [];
      const userValues = [];
      for (const field of ['email', 'nombre_completo', 'telefono']) {
        if (changes[field] === undefined) continue;
        userFields.push(`${field} = ?`);
        userValues.push(changes[field]);
      }
      if (changes.estado) {
        userFields.push('status = ?');
        userValues.push(changes.estado === 'activo' ? 'active' : 'inactive');
        if (changes.estado === 'inactivo') userFields.push('refresh_token_hash = NULL');
      }
      if (userFields.length) {
        await connection.execute(
          `UPDATE users SET ${userFields.join(', ')} WHERE codigo_estudiante = ?`,
          [...userValues, student.codigo_estudiante],
        );
      }
      return { success: true };
    });
  }

  async deactivate(id) {
    return this.database.transaction(async connection => {
      const [students] = await connection.execute(
        'SELECT codigo_estudiante, casos_activos FROM estudiantes_odontologia WHERE id = ? FOR UPDATE', [id],
      );
      const student = students[0];
      if (!student) return { missing: true };
      if (Number(student.casos_activos) > 0) return { activeCases: true };
      await connection.execute(
        "UPDATE estudiantes_odontologia SET estado = 'inactivo', fecha_actualizacion = NOW() WHERE id = ?", [id],
      );
      await connection.execute(
        "UPDATE users SET status = 'inactive', refresh_token_hash = NULL WHERE codigo_estudiante = ?",
        [student.codigo_estudiante],
      );
      return { success: true };
    });
  }
}

module.exports = StudentRepository;
