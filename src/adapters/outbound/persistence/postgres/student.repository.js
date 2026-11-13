const { ACTIVE_ASSIGNMENT_STATES } = require('../../../../domain/common');
const { ConflictError, NotFoundError } = require('../../../../shared/errors/AppError');

const CLINICS = Object.freeze({
  child: 'Clínica para el Niño y Adolescente',
  adult: 'Clínica Integral Adulto y Gerontología',
});

class StudentRepository {
  constructor(database, codeGenerator) {
    this.database = database;
    this.codeGenerator = codeGenerator;
  }

  async register(student, passwordHash, approved) {
    return this.database.transaction(async (connection) => {
      const students = await connection.query(
        'SELECT 1 FROM estudiantes_odontologia WHERE email = $1 LIMIT 1',
        [student.email]
      );
      const users = await connection.query(
        'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
        [student.email]
      );
      if (students.rows.length || users.rows.length) return { duplicate: true };

      const code = await this.codeGenerator.generateUniqueCode(connection);
      const insert = await connection.query(
        `INSERT INTO estudiantes_odontologia
         (codigo_estudiante, nombre_completo, año_carrera, telefono, email, universidad, ciudad,
          casos_necesarios, casos_activos, casos_completados, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, $9)
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
          approved ? 'activo' : 'inactivo',
        ]
      );
      const studentId = insert.rows[0].id;

      for (const specialty of student.specialties) {
        const clinic =
          specialty === 'Odontopediatría' ? CLINICS.child : CLINICS.adult;
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
            ]
          );
        }
      }

      const status = approved ? 'active' : 'pending';
      await connection.query(
        `INSERT INTO users
         (email, password, nombre_completo, role, permissions, codigo_estudiante, telefono, status)
         VALUES ($1, $2, $3, 'student', $4, $5, $6, $7)`,
        [
          student.email,
          passwordHash,
          student.nombre_completo,
          JSON.stringify(['assignments:own']),
          code,
          student.telefono,
          status,
        ]
      );
      return { id: studentId, codigo_estudiante: code, status };
    });
  }

  async availability(code) {
    const db = await this.database.getConnection();
    const id = await this.activeStudentId(db, code);
    const schedules = await db.query(
      `SELECT id,especialidad,clinica,dia_semana,hora_inicio,hora_fin
      FROM especialidades_estudiante WHERE id_estudiante=$1 AND activo=TRUE
      ORDER BY especialidad,dia_semana,hora_inicio,id`,
      [id]
    );
    const absences = await db.query(
      `SELECT fecha::text FROM ausencias_estudiante WHERE id_estudiante=$1
      AND fecha >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date ORDER BY fecha`,
      [id]
    );
    return { horarios: schedules.rows, ausencias: absences.rows.map(row => row.fecha) };
  }

  async activeStudentId(db, code) {
    const result = await db.query(
      "SELECT id FROM estudiantes_odontologia WHERE codigo_estudiante=$1 AND estado='activo'",
      [code]
    );
    if (!result.rows.length) throw new NotFoundError('Perfil de estudiante');
    return result.rows[0].id;
  }

  updateSchedule(code, scheduleId, { dia_semana, hora_inicio, hora_fin }) {
    return this.database.transaction(async db => {
      await db.query("SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))");
      const id = await this.activeStudentId(db, code);
      const schedule = await db.query(
        `SELECT especialidad FROM especialidades_estudiante
        WHERE id=$1 AND id_estudiante=$2 AND activo=TRUE FOR UPDATE`,
        [scheduleId, id]
      );
      if (!schedule.rows.length) throw new NotFoundError('Horario');
      const overlap = await db.query(
        `SELECT 1 FROM especialidades_estudiante WHERE id_estudiante=$1
        AND especialidad=$2 AND dia_semana=$3 AND id<>$6
        AND (activo OR (hora_inicio=$4 AND hora_fin=$5))
        AND hora_inicio<$5 AND hora_fin>$4`,
        [id, schedule.rows[0].especialidad, dia_semana, hora_inicio, hora_fin, scheduleId]
      );
      if (overlap.rows.length)
        throw new ConflictError('Ya tienes un horario que se cruza para esta especialidad');
      await db.query(
        `UPDATE especialidades_estudiante SET dia_semana=$1,hora_inicio=$2,hora_fin=$3,
        fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$4`,
        [dia_semana, hora_inicio, hora_fin, scheduleId]
      );
    });
  }

  updateAbsence(code, date, blocked) {
    return this.database.transaction(async db => {
      await db.query("SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))");
      const id = await this.activeStudentId(db, code);
      if (!blocked) {
        await db.query('DELETE FROM ausencias_estudiante WHERE id_estudiante=$1 AND fecha=$2', [id, date]);
        return;
      }
      const past = await db.query(`SELECT $1::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date AS past`, [date]);
      if (past.rows[0].past) throw new ConflictError('La ausencia debe ser para hoy o una fecha futura');
      const assignments = await db.query(
        `SELECT 1 FROM asignaciones WHERE id_estudiante=$1 AND fecha_cita=$2
        AND estado=ANY($3::text[]) LIMIT 1`,
        [id, date, ACTIVE_ASSIGNMENT_STATES]
      );
      if (assignments.rows.length)
        throw new ConflictError('Ya tienes una cita activa ese día. Coordina su cambio antes de bloquearlo');
      await db.query(
        'INSERT INTO ausencias_estudiante (id_estudiante,fecha) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, date]
      );
    });
  }

  async list() {
    const db = await this.database.getConnection();
    return (
      await db.query(
        `SELECT e.id, e.codigo_estudiante, e.nombre_completo, e.año_carrera, e.telefono, e.email,
              e.universidad, e.ciudad, e.estado, e.casos_activos, e.casos_completados,
              e.casos_necesarios, e.fecha_registro,
              u.status AS cuenta_estado,
              STRING_AGG(DISTINCT ee.especialidad, ', ' ORDER BY ee.especialidad) AS especialidades,
              COALESCE(jsonb_agg(jsonb_build_object('especialidad', ee.especialidad,
                'dia', ee.dia_semana, 'inicio', ee.hora_inicio, 'fin', ee.hora_fin,
                'capacidad', ee.capacidad_pacientes)
                ORDER BY ee.especialidad, ee.dia_semana, ee.hora_inicio) FILTER (WHERE ee.id IS NOT NULL), '[]') AS horarios
         FROM estudiantes_odontologia e
         LEFT JOIN users u ON u.codigo_estudiante = e.codigo_estudiante AND u.role = 'student'
         LEFT JOIN especialidades_estudiante ee ON ee.id_estudiante = e.id AND ee.activo = TRUE
        GROUP BY e.id, u.status
        ORDER BY (u.status = 'pending') DESC NULLS LAST, (e.estado = 'activo') DESC, e.nombre_completo ASC`
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
         FROM estudiantes_odontologia`
    );
    return result.rows[0];
  }

  setAccountStatus(id, status) {
    return this.database.transaction(async db => {
      await db.query("SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))");
      const account = (await db.query(
        `SELECT u.id, u.status FROM estudiantes_odontologia e JOIN users u
          ON u.codigo_estudiante=e.codigo_estudiante AND u.role='student'
          WHERE e.id=$1 FOR UPDATE OF e,u`, [id]
      )).rows[0];
      if (!account) throw new NotFoundError('Cuenta de estudiante', id);
      if (account.status === status) return { status };
      if (status === 'suspended' && account.status !== 'active')
        throw new ConflictError('Solo se puede suspender una cuenta activa');
      await db.query(
        'UPDATE estudiantes_odontologia SET estado=$1, fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$2',
        [status === 'active' ? 'activo' : 'inactivo', id]
      );
      await db.query(
        `UPDATE users SET status=$1, session_version=session_version+1, refresh_token_hash=NULL,
          updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [status, account.id]
      );
      return { status };
    });
  }

  async update(id, changes, decide) {
    return this.database.transaction(async (connection) => {
      const students = await connection.query(
        'SELECT codigo_estudiante, casos_activos FROM estudiantes_odontologia WHERE id = $1 FOR UPDATE',
        [id]
      );
      const student = students.rows[0];
      if (!student) return { missing: true };
      const decision = decide(student);
      if (!decision.success) return decision;

      const entries = Object.entries(changes);
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(
        ([field], index) => `${field} = $${index + 1}`
      );
      values.push(id);
      await connection.query(
        `UPDATE estudiantes_odontologia
            SET ${assignments.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id = $${values.length}`,
        values
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
      if (userFields.length) {
        userValues.push(student.codigo_estudiante);
        await connection.query(
          `UPDATE users
              SET ${userFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE codigo_estudiante = $${userValues.length} AND role='student'`,
          userValues
        );
      }
      return { success: true };
    });
  }

  async deactivate(id) {
    return this.database.transaction(async (connection) => {
      await connection.query("SELECT pg_advisory_xact_lock(hashtext('dental_match_allocation'))");
      const students = await connection.query(
        'SELECT codigo_estudiante, casos_activos FROM estudiantes_odontologia WHERE id = $1 FOR UPDATE',
        [id]
      );
      const student = students.rows[0];
      if (!student) return { missing: true };
      if (Number(student.casos_activos) > 0) return { activeCases: true };
      await connection.query(
        "UPDATE estudiantes_odontologia SET estado = 'inactivo', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      await connection.query(
        `UPDATE users
            SET status = 'inactive', session_version=session_version+1, refresh_token_hash = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE codigo_estudiante = $1 AND role='student' AND status='active'`,
        [student.codigo_estudiante]
      );
      return { success: true };
    });
  }
}

module.exports = StudentRepository;
