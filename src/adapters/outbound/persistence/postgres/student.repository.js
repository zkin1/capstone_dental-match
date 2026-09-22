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
    return this.database.transaction(async (connection) => {
      const students = await connection.query('SELECT 1 FROM estudiantes_odontologia WHERE email = $1 LIMIT 1', [
        student.email,
      ]);
      const users = await connection.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [student.email]);
      if (students.rows.length || users.rows.length) return { duplicate: true };

      const code = await this.codeGenerator.generateUniqueCode(connection);
      const insert = await connection.query(
        `INSERT INTO estudiantes_odontologia
         (codigo_estudiante, nombre_completo, año_carrera, telefono, email, universidad, ciudad,
          casos_necesarios, casos_activos, casos_completados, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 'activo')
         RETURNING id`,
        [
          code,
          student.nombre_completo,
          student.año_carrera,
          student.telefono,
          student.email,
          student.universidad,
          student.ciudad,
          student.casos_necesarios,
        ],
      );
      const studentId = insert.rows[0].id;

      for (const specialty of student.specialties) {
        const clinic = specialty === 'Odontopediatría' ? CLINICS.child : CLINICS.adult;
        for (const slot of student.schedules) {
          await connection.query(
            `INSERT INTO especialidades_estudiante
             (id_estudiante, especialidad, clinica, dia_semana, hora_inicio, hora_fin, capacidad_pacientes, activo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
            [
              studentId,
              specialty,
              clinic,
              slot.dia,
              slot.hora_inicio,
              slot.hora_fin,
              Number(slot.capacidad_pacientes) || 1,
            ],
          );
        }
      }

      await connection.query(
        `INSERT INTO users
         (email, password, nombre_completo, role, permissions, codigo_estudiante, telefono, status)
         VALUES ($1, $2, $3, 'student', $4, $5, $6, 'active')`,
        [
          student.email,
          passwordHash,
          student.nombre_completo,
          JSON.stringify(['assignments:own']),
          code,
          student.telefono,
        ],
      );
      return { id: studentId, codigo_estudiante: code };
    });
  }

  async list() {
    const db = await this.database.getConnection();
    return (
      await db.query(
        `SELECT e.id, e.codigo_estudiante, e.nombre_completo, e.año_carrera, e.telefono, e.email,
              e.universidad, e.ciudad, e.estado, e.casos_activos, e.casos_completados,
              e.casos_necesarios, e.fecha_registro,
              STRING_AGG(DISTINCT ee.especialidad, ', ' ORDER BY ee.especialidad) AS especialidades
         FROM estudiantes_odontologia e
         LEFT JOIN especialidades_estudiante ee ON ee.id_estudiante = e.id AND ee.activo = TRUE
        GROUP BY e.id
        ORDER BY (e.estado = 'activo') DESC, e.nombre_completo ASC`,
      )
    ).rows;
  }

  async getStats() {
    const db = await this.database.getConnection();
    const result = await db.query(
      `SELECT COUNT(*) AS total_estudiantes,
              COUNT(*) FILTER (WHERE estado = 'activo') AS activos,
              COALESCE(SUM(casos_activos), 0) AS total_casos_activos,
              COALESCE(SUM(casos_completados), 0) AS total_casos_completados
         FROM estudiantes_odontologia`,
    );
    return result.rows[0];
  }

  async update(id, changes, decide) {
    return this.database.transaction(async (connection) => {
      const students = await connection.query(
        'SELECT codigo_estudiante, casos_activos FROM estudiantes_odontologia WHERE id = $1 FOR UPDATE',
        [id],
      );
      const student = students.rows[0];
      if (!student) return { missing: true };
      const decision = decide(student);
      if (!decision.success) return decision;

      const entries = Object.entries(changes);
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(([field], index) => `${field} = $${index + 1}`);
      values.push(id);
      await connection.query(
        `UPDATE estudiantes_odontologia
            SET ${assignments.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $${values.length}`,
        values,
      );

      const userFields = [];
      const userValues = [];
      const addUserField = (field, value) => {
        userValues.push(value);
        userFields.push(`${field} = $${userValues.length}`);
      };
      for (const field of ['email', 'nombre_completo', 'telefono']) {
        if (changes[field] !== undefined) addUserField(field, changes[field]);
      }
      if (changes.estado) {
        addUserField('status', changes.estado === 'activo' ? 'active' : 'inactive');
        if (changes.estado === 'inactivo') userFields.push('refresh_token_hash = NULL');
      }
      if (userFields.length) {
        userValues.push(student.codigo_estudiante);
        await connection.query(
          `UPDATE users
              SET ${userFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE codigo_estudiante = $${userValues.length}`,
          userValues,
        );
      }
      return { success: true };
    });
  }

  async deactivate(id) {
    return this.database.transaction(async (connection) => {
      const students = await connection.query(
        'SELECT codigo_estudiante, casos_activos FROM estudiantes_odontologia WHERE id = $1 FOR UPDATE',
        [id],
      );
      const student = students.rows[0];
      if (!student) return { missing: true };
      if (Number(student.casos_activos) > 0) return { activeCases: true };
      await connection.query(
        "UPDATE estudiantes_odontologia SET estado = 'inactivo', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1",
        [id],
      );
      await connection.query(
        `UPDATE users
            SET status = 'inactive', refresh_token_hash = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE codigo_estudiante = $1`,
        [student.codigo_estudiante],
      );
      return { success: true };
    });
  }
}

module.exports = StudentRepository;
